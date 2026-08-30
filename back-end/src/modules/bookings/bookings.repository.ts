import { Injectable } from '@nestjs/common';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsRepository {
  private readonly bookings: Booking[] = [];

  findAll(): Booking[] {
    this.autoCancelExpiredPending();
    return this.bookings;
  }

  findById(id: string): Booking | undefined {
    this.autoCancelExpiredPending();
    return this.bookings.find((booking) => booking.id === id);
  }

  findByProvider(providerId: string): Booking[] {
    this.autoCancelExpiredPending();
    return this.bookings.filter((booking) => booking.providerId === providerId);
  }

  findByProviderAndDate(providerId: string, date: string): Booking[] {
    this.autoCancelExpiredPending();
    return this.bookings.filter((booking) => booking.providerId === providerId && booking.date === date);
  }

  create(data: CreateBookingDto): Booking {
    const status = data.status ?? 'Pending';
    const createdAt = new Date().toISOString();
    const booking = {
      ...data,
      id: this.nextBookingReference(createdAt),
      createdAt,
      status,
      category: status,
      paymentStatus: this.paymentStatusFor(status),
      paymentDate: data.paymentDate ?? this.paymentDateFor(data.date),
      receivedDate: status === 'Completed' ? (data.receivedDate ?? this.receivedDateFor(data.date)) : undefined,
    };
    this.bookings.unshift(booking);
    return booking;
  }

  update(id: string, data: UpdateBookingDto): Booking | undefined {
    const booking = this.findById(id);
    if (!booking) return undefined;
    Object.assign(booking, data);
    if (data.status) {
      booking.category = data.status;
      booking.paymentStatus = this.paymentStatusFor(data.status);
      if (!booking.paymentDate) booking.paymentDate = this.paymentDateFor(booking.date);
      booking.receivedDate = data.status === 'Completed'
        ? (data.receivedDate ?? booking.receivedDate ?? this.receivedDateFor(booking.date))
        : undefined;
    }
    return booking;
  }

  private paymentStatusFor(status: string): string {
    if (status === 'Completed') return 'Successful';
    if (status === 'Cancelled') return 'Refunded';
    return 'Pending';
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
    return deletedBooking;
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

  private autoCancelExpiredPending(): void {
    this.bookings.forEach((booking) => {
      if (booking.cancellationReason === 'Automatically cancelled because the provider did not confirm the booking before the scheduled service date.') {
        booking.status = 'Pending';
        booking.category = 'Pending';
        booking.paymentStatus = 'Pending';
        delete (booking as any).cancellationReason;
      }
    });
  }

  private parseServiceDate(value: string): Date | undefined {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
}
