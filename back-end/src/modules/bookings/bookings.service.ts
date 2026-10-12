import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { canonicalProviderId } from '../../common/provider-identity';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ProviderBookingStatusDto } from './dto/provider-booking-status.dto';
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

  findForProvider(request: Request): Booking[] {
    return this.bookingsRepository.findByProvider(this.providerIdFromRequest(request));
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

  updateProviderStatus(id: string, data: ProviderBookingStatusDto, request: Request): Booking {
    const providerId = this.providerIdFromRequest(request);
    const existing = this.findById(id);
    if (canonicalProviderId(existing.providerId) !== providerId) {
      throw new ForbiddenException('You can update only bookings belonging to your provider account.');
    }
    if (data.stateVersion !== undefined && existing.stateVersion !== undefined && data.stateVersion !== existing.stateVersion) {
      throw new ConflictException('This booking has changed. Refresh it before updating its status.');
    }

    const allowedNextStatuses: Record<string, string[]> = {
      Pending: ['Accepted', 'Rejected'],
      Accepted: ['Completed', 'Cancelled'],
    };
    if (!allowedNextStatuses[existing.status]?.includes(data.status)) {
      throw new BadRequestException(`Cannot change booking status from ${existing.status} to ${data.status}.`);
    }

    return this.bookingsRepository.update(id, {
      status: data.status,
      ...(data.stateVersion === undefined ? {} : { stateVersion: data.stateVersion }),
    })!;
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

  private providerIdFromRequest(request: Request): string {
    const header = request.headers['user-id'];
    const providerId = String(Array.isArray(header) ? header[0] : header || '').trim();
    if (!providerId) throw new BadRequestException('A provider identity header is required.');
    const canonicalId = canonicalProviderId(providerId);
    if (!canonicalId) throw new BadRequestException('A valid provider identity is required.');
    return canonicalId;
  }
}
