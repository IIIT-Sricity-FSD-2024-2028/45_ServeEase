import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsRepository {
  private readonly bookings: Booking[] = [];

  findAll(): Booking[] {
    return this.bookings;
  }

  findById(id: string): Booking | undefined {
    return this.bookings.find((booking) => booking.id === id);
  }

  findByProvider(providerId: string): Booking[] {
    return this.bookings.filter((booking) => booking.providerId === providerId);
  }

  findByProviderAndDate(providerId: string, date: string): Booking[] {
    return this.bookings.filter((booking) => booking.providerId === providerId && booking.date === date);
  }

  create(data: CreateBookingDto): Booking {
    const status = data.status ?? 'Pending';
    const booking = {
      ...data,
      id: randomUUID(),
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
}
