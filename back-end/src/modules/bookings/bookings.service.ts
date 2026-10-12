import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { canonicalProviderId } from '../../common/provider-identity';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ProviderBookingStatusDto } from './dto/provider-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingsRepository } from './bookings.repository';
import { AvailabilityService } from '../availability/availability.service';
import { CatalogService } from '../catalog/catalog.service';
import { CreateCustomerBookingDto } from './dto/create-customer-booking.dto';

/** Identifiers supplied by the caller for compatibility with the header-RBAC assignment.
 * These values are not authenticated identity claims and must not be described as secure ownership.
 */
export interface BookingRequestContext {
  role: string;
  userId: string;
  email: string;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly catalogService: CatalogService,
  ) {}

  findAll(caller: BookingRequestContext): Booking[] {
    if (caller.role === 'admin') return this.bookingsRepository.findAll();
    if (caller.role === 'provider') return caller.userId ? this.bookingsRepository.findByProvider(caller.userId) : [];
    if (caller.role === 'user') return this.bookingsRepository.findByCustomerIdentity(caller.userId, caller.email);
    throw new ForbiddenException('This role cannot access bookings.');
  }

  findForProvider(request: Request): Booking[] {
    return this.bookingsRepository.findByProvider(this.providerIdFromRequest(request));
  }

  findById(id: string, caller: BookingRequestContext): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.findById(id);
    if (!booking || !this.matchesCaller(booking, caller)) {
      throw new NotFoundException(`Booking with id "${id}" was not found.`);
    }
    return booking;
  }

  /** Internal service lookup for workflows that have already authorized their own caller. */
  findByIdForSystem(id: string): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.findById(id);
    if (!booking) throw new NotFoundException(`Booking with id "${id}" was not found.`);
    return booking;
  }

  create(data: CreateBookingDto): Booking {
    this.availabilityService.assertBookable(data.providerId, data.date, data.time);
    return this.bookingsRepository.create(data);
  }

  createForCustomer(data: CreateCustomerBookingDto, caller: BookingRequestContext): Booking {
    if (caller.role !== 'user') throw new ForbiddenException('Only the user role can create customer bookings.');
    if (!caller.userId && !caller.email) throw new BadRequestException('A user-id or user-email header is required for this workflow.');

    const requestedProviderId = canonicalProviderId(data.providerId);
    const provider = this.catalogService.findAll().providers.find((candidate) =>
      canonicalProviderId(candidate.id) === requestedProviderId || canonicalProviderId(candidate.ownerProviderId || '') === requestedProviderId,
    );
    if (!provider) throw new NotFoundException('The selected provider was not found.');

    const serviceKey = (value: string) => String(value || '').trim().toLowerCase();
    const requestedService = serviceKey(data.service);
    const servicePrice = Object.entries(provider.servicePricing || {}).find(([name]) => serviceKey(name) === requestedService)?.[1];
    const serviceRecord = (provider.services || []).find((service: any) =>
      service && serviceKey(service.name || service.serviceName) === requestedService,
    );
    const listedService = (provider.subServices || []).some((name) => serviceKey(name) === requestedService);
    const price = Number(servicePrice ?? serviceRecord?.price ?? serviceRecord?.serviceFee ?? (listedService ? provider.startingPrice : NaN));
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('The selected service has no server-side catalog price.');

    const providerId = canonicalProviderId(provider.ownerProviderId || provider.id);
    this.availabilityService.assertBookable(providerId, data.date, data.time);
    return this.bookingsRepository.create({
      service: data.service.trim(),
      provider: provider.name,
      providerId,
      date: data.date,
      time: data.time,
      address: data.address.trim(),
      amount: price,
      serviceFee: price,
      customerTotal: price,
      customerId: caller.userId,
      customerName: data.customerName || caller.userId || caller.email,
      customerPhone: data.customerPhone || '',
      customerEmail: caller.email,
      status: 'Pending',
      category: provider.category || data.service.trim(),
      paymentStatus: 'Pending',
    } as CreateBookingDto);
  }

  update(id: string, data: UpdateBookingDto): Booking {
    this.validateId(id);
    if (Object.keys(data).length === 0) throw new BadRequestException('At least one field must be provided for update.');
    const existing = this.bookingsRepository.findById(id);
    if (!existing) throw new NotFoundException(`Booking with id "${id}" was not found.`);
    if (data.providerId !== undefined || data.date !== undefined || data.time !== undefined) {
      this.availabilityService.assertBookable(data.providerId ?? existing.providerId, data.date ?? existing.date, data.time ?? existing.time, id);
    }
    return this.bookingsRepository.update(id, data)!;
  }

  updateProviderStatus(id: string, data: ProviderBookingStatusDto, request: Request): Booking {
    const providerId = this.providerIdFromRequest(request);
    const existing = this.findByIdForSystem(id);
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

    const update: UpdateBookingDto = {
      status: data.status,
      ...(data.stateVersion === undefined ? {} : { stateVersion: data.stateVersion }),
    };
    if (data.status === 'Rejected' || data.status === 'Cancelled') {
      update.cancellationActor = 'Provider';
      update.cancelledAt = new Date().toISOString();
    }
    if (data.status === 'Completed') update.receivedDate = new Date().toISOString().slice(0, 10);
    return this.bookingsRepository.update(id, update)!;
  }

  updateForCaller(id: string, data: UpdateBookingDto, caller: BookingRequestContext): Booking {
    if (caller.role === 'admin') return this.update(id, data);
    if (Object.keys(data).length !== 1 || typeof data.status !== 'string') {
      throw new ForbiddenException('Only a booking status change is allowed for this role.');
    }
    const booking = this.findById(id, caller);
    const transitions: Record<string, Record<string, string[]>> = {
      user: { Cancelled: ['Pending', 'Accepted'] },
      provider: { Accepted: ['Pending'], Rejected: ['Pending'], Completed: ['Accepted'], Cancelled: ['Accepted'] },
    };
    if (!transitions[caller.role]?.[data.status]?.includes(booking.status)) {
      throw new BadRequestException('This booking status transition is not allowed.');
    }
    const update: UpdateBookingDto = { status: data.status };
    if (data.status === 'Cancelled' || data.status === 'Rejected') {
      update.cancellationActor = caller.role === 'user' ? 'Customer' : 'Provider';
      update.cancelledAt = new Date().toISOString();
    }
    if (data.status === 'Completed') update.receivedDate = new Date().toISOString().slice(0, 10);
    return this.bookingsRepository.update(id, update)!;
  }

  delete(id: string): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.delete(id);
    if (!booking) throw new NotFoundException(`Booking with id "${id}" was not found.`);
    return booking;
  }

  private matchesCaller(booking: Booking, caller: BookingRequestContext): boolean {
    if (caller.role === 'admin') return true;
    if (caller.role === 'user') {
      return Boolean((caller.userId && booking.customerId === caller.userId) ||
        (caller.email && booking.customerEmail?.toLowerCase() === caller.email.toLowerCase()));
    }
    if (caller.role === 'provider') {
      return Boolean(caller.userId && canonicalProviderId(booking.providerId) === canonicalProviderId(caller.userId));
    }
    return false;
  }

  private validateId(id: string): void {
    const referencePattern = /^BOOK-\d{8}-\d{4}-\d{4}$/;
    if (!id || !referencePattern.test(id)) throw new BadRequestException('Invalid booking id. Expected a booking reference.');
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
