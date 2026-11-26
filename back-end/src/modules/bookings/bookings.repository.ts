import { Injectable } from '@nestjs/common';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { StateRepository } from '../state/state.repository';
import { canonicalProviderId } from '../../common/provider-identity';
import { appointmentStart, canonicalPaymentStatus, cancellationSettlement } from './booking-finance';

export const UNCONFIRMED_CANCEL_REASON = 'Automatically cancelled because the provider did not accept the booking before the slot started.';

@Injectable()
export class BookingsRepository {
  private readonly bookings: Booking[] = [];
  private readonly stateKey = 'serveEaseCanonicalBookings';

  constructor(private readonly state: StateRepository) {
    const stored = state.findById(this.stateKey);
    if (stored?.value && Array.isArray((stored.value as { bookings?: Booking[] }).bookings)) {
      this.bookings.push(...((stored.value as { bookings: Booking[] }).bookings));
    }
    // Legacy records stored 'Successful' or 'Pending' for payments that are really Paid or Refunded.
    const normalised = this.bookings.filter((booking) => {
      const canonical = canonicalPaymentStatus(booking);
      if (booking.paymentStatus === canonical) return false;
      booking.paymentStatus = canonical;
      return true;
    });
    if (normalised.length) this.persist();
  }

  findAll(): Booking[] {
    this.applyScheduleRules();
    return this.bookings;
  }

  findByCustomer(customerId: string): Booking[] {
    this.applyScheduleRules();
    return this.bookings.filter((booking) => String(booking.customerId || '') === customerId);
  }

  findByCustomerIdentity(customerId: string, email: string): Booking[] {
    this.applyScheduleRules();
    const normalizedEmail = String(email || '').toLowerCase();
    return this.bookings.filter((booking) =>
      Boolean((customerId && String(booking.customerId || '') === customerId) ||
        (normalizedEmail && String(booking.customerEmail || '').toLowerCase() === normalizedEmail)),
    );
  }

  findById(id: string): Booking | undefined {
    this.applyScheduleRules();
    return this.bookings.find((booking) => booking.id === id);
  }

  findByProvider(providerId: string): Booking[] {
    this.applyScheduleRules();
    const canonicalId = canonicalProviderId(providerId);
    return this.bookings.filter((booking) => canonicalProviderId(booking.providerId) === canonicalId);
  }

  findByProviderAndDate(providerId: string, date: string): Booking[] {
    this.applyScheduleRules();
    const canonicalId = canonicalProviderId(providerId);
    return this.bookings.filter((booking) => canonicalProviderId(booking.providerId) === canonicalId && booking.date === date);
  }

  create(data: CreateBookingDto): Booking {
    data.providerId = canonicalProviderId(data.providerId);
    const status = data.status ?? 'Pending';
    const createdAt = new Date().toISOString();
    const id = this.nextBookingReference(createdAt);
    const booking = {
      ...data,
      id,
      createdAt,
      status,
      category: data.category ?? data.service,
      paymentStatus: canonicalPaymentStatus(data),
      paymentDate: data.paymentDate ?? this.paymentDateFor(data.date),
      paymentId: data.paymentId ?? `TXN-${id.replace(/^BOOK-/, '')}`,
      statusUpdatedAt: data.statusUpdatedAt ?? createdAt,
      stateVersion: data.stateVersion ?? 1,
      receivedDate: status === 'Completed' ? (data.receivedDate ?? this.receivedDateFor(data.date)) : undefined,
    };
    this.bookings.unshift(booking);
    this.persist();
    return booking;
  }

  update(id: string, data: UpdateBookingDto): Booking | undefined {
    const booking = this.findById(id);
    if (!booking) return undefined;
    if (booking.status === 'Cancelled' && data.status && data.status !== 'Cancelled') {
      return booking;
    }
    if (data.stateVersion !== undefined && booking.stateVersion !== undefined && data.stateVersion < booking.stateVersion) {
      return booking;
    }
    const priorStatus = booking.status;
    const nextStateVersion = Math.max(Number(booking.stateVersion) || 0, Number(data.stateVersion) || 0) + 1;
    Object.assign(booking, data);
    booking.paymentStatus = canonicalPaymentStatus(booking);
    booking.stateVersion = nextStateVersion;
    if (data.status && data.status !== priorStatus) booking.statusUpdatedAt = data.statusUpdatedAt ?? new Date().toISOString();
    if (data.status) {
      if (!booking.paymentDate) booking.paymentDate = this.paymentDateFor(booking.date);
      booking.receivedDate = data.status === 'Completed'
        ? (data.receivedDate ?? booking.receivedDate ?? this.receivedDateFor(booking.date))
        : undefined;
    }
    this.persist();
    return booking;
  }

  reschedule(id: string, change: { date: string; time: string; rescheduledAt: string; rescheduledBy: string }): Booking | undefined {
    const booking = this.findById(id);
    if (!booking) return undefined;
    const entry = { fromDate: booking.date, fromTime: booking.time, toDate: change.date, toTime: change.time, rescheduledAt: change.rescheduledAt, rescheduledBy: change.rescheduledBy };
    if (!booking.originalDate) booking.originalDate = booking.date;
    if (!booking.originalTime) booking.originalTime = booking.time;
    booking.date = change.date;
    booking.time = change.time;
    booking.rescheduledAt = change.rescheduledAt;
    booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
    booking.rescheduleHistory = [...(booking.rescheduleHistory || []), entry].slice(-10);
    booking.stateVersion = (Number(booking.stateVersion) || 0) + 1;
    this.persist();
    return booking;
  }

  private paymentDateFor(serviceDate: string): string {
    const now = new Date();
    const service = new Date(serviceDate);
    if (!Number.isNaN(service.getTime()) && now.getTime() > service.getTime()) {
      service.setDate(service.getDate() - 1);
      return service.toISOString().slice(0, 10);
    }
    return now.toISOString().slice(0, 10);
  }

  private receivedDateFor(serviceDate: string): string {
    const now = new Date();
    const service = new Date(serviceDate);
    if (!Number.isNaN(service.getTime()) && now.getTime() < service.getTime()) {
      return service.toISOString().slice(0, 10);
    }
    return now.toISOString().slice(0, 10);
  }

  delete(id: string): Booking | undefined {
    const index = this.bookings.findIndex((booking) => booking.id === id);
    if (index === -1) return undefined;
    const [deletedBooking] = this.bookings.splice(index, 1);
    this.persist();
    return deletedBooking;
  }

  private persist(): void {
    this.state.create({ key: this.stateKey, value: { bookings: this.bookings as unknown as Record<string, unknown>[] } });
  }

  private nextBookingReference(createdAt: string): string {
    const stamp = new Date(createdAt);
    const date = stamp.getFullYear() + String(stamp.getMonth() + 1).padStart(2, '0') + String(stamp.getDate()).padStart(2, '0');
    const time = String(stamp.getHours()).padStart(2, '0') + String(stamp.getMinutes()).padStart(2, '0');
    const next = this.bookings.reduce((max, booking) => {
      const match = booking.id.match(/^BOOK-\d{8}-\d{4}-(\d{4})$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    return `BOOK-${date}-${time}-${String(next).padStart(4, '0')}`;
  }

  // Runs before every read: an unaccepted booking is cancelled once its slot starts, and an
  // accepted booking is completed from the day after its service date.
  private applyScheduleRules(now = new Date()): void {
    let changed = false;
    for (const booking of this.bookings) {
      const start = appointmentStart(booking.date, booking.time);
      if (!start) continue;
      const nextDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      const timestamp = now.toISOString();
      if (booking.status === 'Pending' && now >= start) {
        Object.assign(booking, cancellationSettlement(booking, 'System', timestamp), {
          status: 'Cancelled', cancellationActor: 'System', cancellationReason: UNCONFIRMED_CANCEL_REASON, cancelledAt: timestamp,
        });
      } else if (booking.status === 'Accepted' && now >= nextDay) {
        Object.assign(booking, { status: 'Completed', payoutStatus: 'Paid', payoutDate: timestamp.slice(0, 10), receivedDate: booking.date });
      } else continue;
      booking.paymentStatus = canonicalPaymentStatus(booking);
      booking.statusUpdatedAt = timestamp;
      booking.stateVersion = (Number(booking.stateVersion) || 0) + 1;
      changed = true;
    }
    if (changed) this.persist();
  }
}
