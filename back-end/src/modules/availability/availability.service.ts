import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking } from '../bookings/booking.entity';
import { BookingsRepository } from '../bookings/bookings.repository';
import { BOOKING_WINDOW_DAYS, MIN_BOOKING_NOTICE_HOURS, WEEKDAYS, Weekday } from './availability.constants';
import { AvailableDate, DateOverride, ProviderAvailability, StoredWeeklySchedule, WeeklySchedule } from './availability.entity';
import { AvailabilityRepository } from './availability.repository';
import { UpsertDateOverrideDto } from './dto/upsert-date-override.dto';
import { UpsertWeeklyScheduleDto, WeeklyScheduleSlotsDto } from './dto/upsert-weekly-schedule.dto';
import { canonicalProviderId } from '../../common/provider-identity';

@Injectable()
export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository, private readonly bookings: BookingsRepository) {}

  getWeeklySchedule(providerId: string): WeeklySchedule { providerId = canonicalProviderId(providerId); return this.toWeeklyScheduleResponse(this.scheduleOrThrow(providerId)); }

  saveWeeklySchedule(providerId: string, data: UpsertWeeklyScheduleDto): WeeklySchedule {
    providerId = canonicalProviderId(providerId); this.validateProviderId(providerId);
    const next: StoredWeeklySchedule = {
      providerId,
      effectiveFrom: this.nextWeekStart(this.today()),
      days: WEEKDAYS.map((dayOfWeek) => ({
        dayOfWeek,
        slots: this.normalizeSlots(data.weeklySchedule[this.weekdayKey(dayOfWeek)] ?? []),
      })),
    };
    next.days.forEach((day) => this.assertNoOverlappingSlots(day.slots, day.dayOfWeek));
    return this.toWeeklyScheduleResponse(this.repository.saveSchedule(next));
  }

  getDateOverrides(providerId: string): DateOverride[] { providerId = canonicalProviderId(providerId); this.validateProviderId(providerId); return this.repository.findOverrides(providerId); }

  saveDateOverride(providerId: string, date: string, data: UpsertDateOverrideDto): DateOverride {
    providerId = canonicalProviderId(providerId); this.validateProviderId(providerId); this.validateDate(date);
    const scheduleSlots = this.slotsForDate(providerId, date);
    const disabledSlots = this.normalizeSlots(data.disabledSlots ?? []);
    const enabledSlots = this.normalizeSlots(data.enabledSlots ?? []);
    const scheduleSet = new Set(scheduleSlots);
    if (!data.fullDayOff && disabledSlots.length === 0 && enabledSlots.length === 0) throw new BadRequestException('A date override must set fullDayOff or change at least one slot.');
    if (disabledSlots.some((slot) => !scheduleSet.has(slot)) || enabledSlots.some((slot) => !scheduleSet.has(slot))) throw new BadRequestException('Date override slots must exist in the provider weekly schedule for that date.');
    if (disabledSlots.some((slot) => enabledSlots.includes(slot))) throw new BadRequestException('A slot cannot be both disabled and enabled in the same date override.');
    const override: DateOverride = { date, fullDayOff: data.fullDayOff, disabledSlots, enabledSlots };
    const available = new Set(this.applyOverride(scheduleSlots, override));
    this.assertNoBookedSlots(providerId, (booking) => booking.date === date && !available.has(this.normalizeSlot(booking.time)));
    return this.repository.saveOverride(providerId, override);
  }

  deleteDateOverride(providerId: string, date: string): DateOverride {
    providerId = canonicalProviderId(providerId); this.validateProviderId(providerId); this.validateDate(date);
    const override = this.repository.deleteOverride(providerId, date);
    if (!override) throw new NotFoundException(`Date override for "${date}" was not found.`);
    return override;
  }

  getAvailability(providerId: string): ProviderAvailability {
    providerId = canonicalProviderId(providerId);
    this.validateProviderId(providerId);
    this.ensureScheduleForAvailability(providerId);
    const dates: AvailableDate[] = this.windowDates(this.today()).map((date) => {
      const booked = this.bookings.findByProviderAndDate(providerId, date).filter((booking) => this.isBookingBlockingAvailability(booking));
      // A recurring schedule change must not erase an already-booked date
      // instance. Keep those times in the response so the UI can show them as
      // booked, while they remain unavailable for new customers.
      const scheduledSlots = this.applyOverride(this.slotsForDate(providerId, date), this.repository.findOverride(providerId, date));
      const allSlots = Array.from(new Set([
        ...scheduledSlots,
        ...booked.map((booking) => this.normalizeSlot(booking.time)),
      ])).sort();
      const slotStates: Record<string, string> = {};
      allSlots.forEach((slot) => {
        // A slot that has already elapsed is past even if its historical
        // booking is still Accepted. Historical bookings must not mask the
        // actual time state of today's availability.
        if (this.isPast(date, slot)) slotStates[slot] = 'past';
        else if (booked.some((booking) => this.slotsOverlap(slot, booking.time))) slotStates[slot] = 'booked';
        else if (!this.meetsMinimumBookingNotice(date, slot)) slotStates[slot] = 'too-soon';
        else slotStates[slot] = 'available';
      });
      return { date, dayOfWeek: this.weekdayForDate(date), slots: allSlots.filter((slot) => slotStates[slot] === 'available'), scheduledSlots, slotStates };
    });
    return { providerId, bookingWindowDays: BOOKING_WINDOW_DAYS, dates };
  }

  assertBookable(providerId: string | undefined, date: string, time: string, excludeBookingId?: string): void {
    providerId = canonicalProviderId(providerId || '');
    if (!providerId?.trim()) throw new BadRequestException('providerId is required to create or reschedule a booking.');
    this.validateDate(date);
    if (!this.windowDates(this.today()).includes(date)) throw new BadRequestException(`Bookings are limited to the next ${BOOKING_WINDOW_DAYS} days.`);
    const normalizedSlot = this.normalizeSlot(time);
    if (!this.meetsMinimumBookingNotice(date, normalizedSlot)) throw new BadRequestException(`Bookings require at least ${MIN_BOOKING_NOTICE_HOURS} hours notice.`);
    if (!this.availableSlotsForDate(providerId, date, excludeBookingId).includes(normalizedSlot)) throw new BadRequestException('The selected slot is unavailable.');
  }

  private availableSlotsForDate(providerId: string, date: string, excludeBookingId?: string): string[] {
    const slots = this.applyOverride(this.slotsForDate(providerId, date), this.repository.findOverride(providerId, date));
    const booked = this.bookings.findByProviderAndDate(providerId, date)
      .filter((booking) => booking.id !== excludeBookingId && this.isBookingBlockingAvailability(booking));
    return slots.filter((slot) => !booked.some((booking) => this.slotsOverlap(slot, booking.time)) && this.meetsMinimumBookingNotice(date, slot));
  }

  private isBookingBlockingAvailability(booking: Booking): boolean {
    return ['pending', 'requested', 'accepted'].includes(String(booking.status || '').trim().toLowerCase());
  }

  private applyOverride(slots: string[], override?: DateOverride): string[] {
    if (!override) return slots;
    const enabled = new Set(override.enabledSlots);
    if (override.fullDayOff) return slots.filter((slot) => enabled.has(slot));
    const disabled = new Set(override.disabledSlots);
    return slots.filter((slot) => !disabled.has(slot) || enabled.has(slot));
  }
  private ensureScheduleForAvailability(providerId: string): StoredWeeklySchedule {
    const existing = this.repository.findSchedule(providerId);
    if (existing) return existing;

    return this.repository.saveSchedule({
      providerId,
      days: WEEKDAYS.map((dayOfWeek) => ({
        dayOfWeek,
        slots: dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday' ? [] : ['09:00-12:00', '13:00-17:00'],
      })),
    });
  }
  private meetsMinimumBookingNotice(date: string, slot: string): boolean {
    if (date !== this.today()) return true;
    const start = this.normalizeSlot(slot).split('-')[0];
    const [hour, minute] = start.split(':').map(Number);
    const slotStart = this.parseDate(date);
    slotStart.setHours(hour, minute, 0, 0);
    const minimumStart = Date.now() + (MIN_BOOKING_NOTICE_HOURS * 60 * 60 * 1000);
    return slotStart.getTime() >= minimumStart;
  }
  private isPast(date: string, slot: string): boolean {
    if (date !== this.today()) return date < this.today();
    const [hour, minute] = this.normalizeSlot(slot).split('-')[0].split(':').map(Number);
    const start = this.parseDate(date); start.setHours(hour, minute, 0, 0);
    return start.getTime() < Date.now();
  }
  private slotsForDate(providerId: string, date: string): string[] { return this.repository.findScheduleForDate(providerId, date)?.days.find((day) => day.dayOfWeek === this.weekdayForDate(date))?.slots ?? []; }
  private scheduleOrThrow(providerId: string): StoredWeeklySchedule { this.validateProviderId(providerId); const schedule = this.repository.findSchedule(providerId); if (!schedule) throw new NotFoundException(`Weekly schedule for provider "${providerId}" was not found.`); return schedule; }
  private toWeeklyScheduleResponse(schedule: StoredWeeklySchedule): WeeklySchedule {
    return {
      providerId: schedule.providerId,
      effectiveFrom: schedule.effectiveFrom,
      weeklySchedule: Object.fromEntries(WEEKDAYS.map((day) => [this.weekdayKey(day), schedule.days.find((item) => item.dayOfWeek === day)?.slots ?? []])),
    };
  }
  private weekdayKey(day: Weekday): keyof WeeklyScheduleSlotsDto { return day.toLowerCase() as keyof WeeklyScheduleSlotsDto; }
  private assertNoBookedSlots(providerId: string, affects: (booking: Booking) => boolean): void {
    if (this.bookings.findByProvider(providerId).some((booking) => this.isBookingBlockingAvailability(booking) && affects(booking))) {
      throw new BadRequestException('A slot with an existing booking cannot be modified or disabled.');
    }
  }
  private normalizeSlots(slots: string[]): string[] { return Array.from(new Set(slots.map((slot) => this.normalizeSlot(slot)))).sort(); }
  private assertNoOverlappingSlots(slots: string[], day: string): void {
    for (let index = 0; index < slots.length; index += 1) {
      for (let next = index + 1; next < slots.length; next += 1) {
        if (this.slotsOverlap(slots[index], slots[next])) throw new BadRequestException(`Slots on ${day} cannot overlap.`);
      }
    }
  }
  private slotsOverlap(left: string, right: string): boolean {
    const [leftStart, leftEnd] = this.slotMinutes(left);
    const [rightStart, rightEnd] = this.slotMinutes(right);
    return leftStart < rightEnd && rightStart < leftEnd;
  }
  private slotMinutes(value: string): [number, number] {
    return this.normalizeSlot(value).split('-').map((part) => {
      const [hours, minutes] = part.split(':').map(Number);
      return hours * 60 + minutes;
    }) as [number, number];
  }
  private normalizeSlot(value: string): string {
    const compact = value.trim().replace(/\s+/g, ' ');
    const twentyFour = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(compact);
    if (twentyFour) { const start = this.formatTime(Number(twentyFour[1]), Number(twentyFour[2])); const end = this.formatTime(Number(twentyFour[3]), Number(twentyFour[4])); if (start >= end) throw new BadRequestException('A slot end time must be after its start time.'); return `${start}-${end}`; }
    const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(compact);
    if (twelveHour) { const start = this.to24(Number(twelveHour[1]), Number(twelveHour[2]), twelveHour[3]); const end = this.to24(Number(twelveHour[4]), Number(twelveHour[5]), twelveHour[6]); if (start >= end) throw new BadRequestException('A slot end time must be after its start time.'); return `${start}-${end}`; }
    throw new BadRequestException('Slots must use HH:mm-HH:mm (for example, 09:00-12:00).');
  }
  private to24(hour: number, minute: number, meridiem: string): string { if (hour < 1 || hour > 12 || minute < 0 || minute > 59) throw new BadRequestException('Invalid slot time.'); return this.formatTime((hour % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0), minute); }
  private formatTime(hour: number, minute: number): string { if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new BadRequestException('Invalid slot time.'); return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; }
  private windowDates(start: string): string[] { const date = this.parseDate(start); return Array.from({ length: BOOKING_WINDOW_DAYS }, () => { const current = this.formatDate(date); date.setDate(date.getDate() + 1); return current; }); }
  private weekdayForDate(date: string): Weekday { return WEEKDAYS[(this.parseDate(date).getDay() + WEEKDAYS.length - 1) % WEEKDAYS.length]; }
  private validateDate(date: string): void { if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || this.formatDate(this.parseDate(date)) !== date) throw new BadRequestException('Date must use valid YYYY-MM-DD format.'); }
  private parseDate(date: string): Date { const [year, month, day] = date.split('-').map(Number); return new Date(year, month - 1, day); }
  private formatDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private today(): string { return this.formatDate(new Date()); }
  private nextWeekStart(date: string): string {
    const value = this.parseDate(date);
    const daysUntilMonday = (8 - value.getDay()) % 7 || 7;
    value.setDate(value.getDate() + daysUntilMonday);
    return this.formatDate(value);
  }
  private validateProviderId(providerId: string): void { if (!providerId?.trim()) throw new BadRequestException('Provider id is required.'); }
}
