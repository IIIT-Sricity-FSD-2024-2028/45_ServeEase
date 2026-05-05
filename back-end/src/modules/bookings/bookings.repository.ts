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

  create(data: CreateBookingDto): Booking {
    const status = data.status ?? 'Pending';
    const booking = {
      ...data,
      id: randomUUID(),
      status,
      category: status,
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
    }
    return booking;
  }

  delete(id: string): Booking | undefined {
    const index = this.bookings.findIndex((booking) => booking.id === id);
    if (index === -1) return undefined;
    const [deletedBooking] = this.bookings.splice(index, 1);
    return deletedBooking;
  }
}
