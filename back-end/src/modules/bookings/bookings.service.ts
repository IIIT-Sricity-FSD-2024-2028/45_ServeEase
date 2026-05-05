import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingsRepository } from './bookings.repository';

@Injectable()
export class BookingsService {
  constructor(private readonly bookingsRepository: BookingsRepository) {}

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
    return this.bookingsRepository.create(data);
  }

  update(id: string, data: UpdateBookingDto): Booking {
    this.validateId(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const booking = this.bookingsRepository.update(id, data);
    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" was not found.`);
    }
    return booking;
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
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidPattern.test(id)) {
      throw new BadRequestException('Invalid booking id. Expected a UUID string.');
    }
  }
}
