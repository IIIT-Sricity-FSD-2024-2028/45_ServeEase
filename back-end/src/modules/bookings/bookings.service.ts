import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingsRepository } from './bookings.repository';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly availabilityService: AvailabilityService,
  ) {}

  findAll(): Booking[] {
    return this.bookingsRepository.findAll();
  }

  findById(id: string): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" was not found.`);
    }
    return booking;
  }

  create(data: CreateBookingDto): Booking {
    this.availabilityService.assertBookable(data.providerId, data.date, data.time);
    return this.bookingsRepository.create(data);
  }

  update(id: string, data: UpdateBookingDto): Booking {
    this.validateId(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const existing = this.bookingsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Booking with id "${id}" was not found.`);
    }
    if (data.status && ['Cancelled', 'Rejected', 'Completed'].includes(data.status)) {
      // Lifecycle transitions release availability by status; booking history is retained.
    }
    if (data.providerId !== undefined || data.date !== undefined || data.time !== undefined) {
      this.availabilityService.assertBookable(data.providerId ?? existing.providerId, data.date ?? existing.date, data.time ?? existing.time, id);
    }
    return this.bookingsRepository.update(id, data)!;
  }

  delete(id: string): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.delete(id);
    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" was not found.`);
    }
    return booking;
  }

  private validateId(id: string): void {
    const referencePattern = /^BOOK-\d{8}-\d{4}-\d{4}$/;
    if (!id || !referencePattern.test(id)) {
      throw new BadRequestException('Invalid booking id. Expected a booking reference.');
    }
  }
}
