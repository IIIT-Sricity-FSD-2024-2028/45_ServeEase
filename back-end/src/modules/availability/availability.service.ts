import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking } from '../bookings/booking.entity';
import { BookingsRepository } from '../bookings/bookings.repository';
import { BOOKING_WINDOW_DAYS, WEEKDAYS, Weekday } from './availability.constants';
import { AvailableDate, DateOverride, ProviderAvailability, StoredWeeklySchedule, WeeklySchedule } from './availability.entity';
import { AvailabilityRepository } from './availability.repository';
import { UpsertDateOverrideDto } from './dto/upsert-date-override.dto';
import { UpsertWeeklyScheduleDto, WeeklyScheduleSlotsDto } from './dto/upsert-weekly-schedule.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository, private readonly bookings: BookingsRepository) {}

  getWeeklySchedule(providerId: string): WeeklySchedule { return this.toWeeklyScheduleResponse(this.scheduleOrThrow(providerId)); }

  saveWeeklySchedule(providerId: string, data: UpsertWeeklyScheduleDto): WeeklySchedule {
    this.validateProviderId(providerId);
    const next: StoredWeeklySchedule = {
      providerId,
      days: WEEKDAYS.map((dayOfWeek) => ({
        dayOfWeek,
        slots: this.normalizeSlots(data.weeklySchedule[this.weekdayKey(dayOfWeek)] ?? []),
      })),
    };
    const existing = this.repository.findSchedule(providerId);
    if (existing) {
      const removed = new Set(existing.days.flatMap((day) => {
        const nextSlots = next.days.find((candidate) => candidate.dayOfWeek === day.dayOfWeek)?.slots ?? [];
        return day.slots.filter((slot) => !nextSlots.includes(slot)).map((slot) => `${day.dayOfWeek}|${slot}`);
      }));
      this.assertNoBookedSlots(providerId, (booking) => removed.has(`${this.weekdayForDate(booking.date)}|${this.normalizeSlot(booking.time)}`));
    }
    return this.toWeeklyScheduleResponse(this.repository.saveSchedule(next));
  }

  getDateOverrides(providerId: string): DateOverride[] { this.validateProviderId(providerId); return this.repository.findOverrides(providerId); }

  saveDateOverride(providerId: string, date: string, data: UpsertDateOverrideDto): DateOverride {
    this.validateProviderId(providerId); this.validateDate(date);
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
    this.validateProviderId(providerId); this.validateDate(date);
    const override = this.repository.deleteOverride(providerId, date);
    if (!override) throw new NotFoundException(`Date override for "${date}" was not found.`);
    return override;
  }

  getAvailability(providerId: string): ProviderAvailability {
    this.validateProviderId(providerId);
    this.ensureScheduleForAvailability(providerId);
    const dates: AvailableDate[] = this.windowDates(this.today()).map((date) => ({ date, dayOfWeek: this.weekdayForDate(date), slots: this.availableSlotsForDate(providerId, date) }));
    return { providerId, bookingWindowDays: BOOKING_WINDOW_DAYS, dates };
  }

  assertBookable(providerId: string | undefined, date: string, time: string, excludeBookingId?: string): void {
    if (!providerId?.trim()) throw new BadRequestException('providerId is required to create or reschedule a booking.');
    this.validateDate(date);
    if (!this.windowDates(this.today()).includes(date)) throw new BadRequestException(`Bookings are limited to the next ${BOOKING_WINDOW_DAYS} days.`);
    if (!this.availableSlotsForDate(providerId, date, excludeBookingId).includes(this.normalizeSlot(time))) throw new BadRequestException('The selected slot is unavailable.');
  }

  private availableSlotsForDate(providerId: string, date: string, excludeBookingId?: string): string[] {
    const slots = this.applyOverride(this.slotsForDate(providerId, date), this.repository.findOverride(providerId, date));
    const booked = new Set(this.bookings.findByProviderAndDate(providerId, date).filter((booking) => booking.id !== excludeBookingId).map((booking) => this.normalizeSlot(booking.time)));
    return slots.filter((slot) => !booked.has(slot));
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
  private slotsForDate(providerId: string, date: string): string[] { return this.scheduleOrThrow(providerId).days.find((day) => day.dayOfWeek === this.weekdayForDate(date))?.slots ?? []; }
  private scheduleOrThrow(providerId: string): StoredWeeklySchedule { this.validateProviderId(providerId); const schedule = this.repository.findSchedule(providerId); if (!schedule) throw new NotFoundException(`Weekly schedule for provider "${providerId}" was not found.`); return schedule; }
  private toWeeklyScheduleResponse(schedule: StoredWeeklySchedule): WeeklySchedule {
    return {
      providerId: schedule.providerId,
      weeklySchedule: Object.fromEntries(WEEKDAYS.map((day) => [this.weekdayKey(day), schedule.days.find((item) => item.dayOfWeek === day)?.slots ?? []])),
    };
  }
  private weekdayKey(day: Weekday): keyof WeeklyScheduleSlotsDto { return day.toLowerCase() as keyof WeeklyScheduleSlotsDto; }
  private assertNoBookedSlots(providerId: string, affects: (booking: Booking) => boolean): void { if (this.bookings.findByProvider(providerId).some(affects)) throw new BadRequestException('A slot with an existing booking cannot be modified or disabled.'); }
  private normalizeSlots(slots: string[]): string[] { return Array.from(new Set(slots.map((slot) => this.normalizeSlot(slot)))).sort(); }
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
  private validateProviderId(providerId: string): void { if (!providerId?.trim()) throw new BadRequestException('Provider id is required.'); }
}
