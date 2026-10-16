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
import { cancellationSettlement, priceBreakdown } from './booking-finance';

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
    if (caller.role === 'customer') return this.bookingsRepository.findByCustomer(caller.userId);
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
    if (caller.role !== 'customer') throw new ForbiddenException('Only customers can create customer bookings.');

    const requestedProviderId = canonicalProviderId(data.providerId);
    const provider = this.catalogService.findAll().providers.find((candidate) =>
      canonicalProviderId(candidate.id) === requestedProviderId || canonicalProviderId(candidate.ownerProviderId || '') === requestedProviderId,
    );
    if (!provider) throw new NotFoundException('The selected provider was not found.');
    // The owning account decides: a suspended, rejected or unverified provider cannot be booked even if a listing remains.
    if (!this.catalogService.isBookable(provider)) throw new ConflictException('This provider is not currently available for booking.');

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
    const charges = priceBreakdown(price);
    return this.bookingsRepository.create({
      service: data.service.trim(),
      provider: provider.name,
      providerId,
      date: data.date,
      time: data.time,
      address: data.address.trim(),
      ...charges,
      amount: charges.customerTotal,
      payoutStatus: 'Pending',
      customerId: caller.userId,
      customerName: data.customerName || caller.userId || caller.email,
      customerPhone: data.customerPhone || '',
      customerEmail: caller.email,
      status: 'Pending',
      category: provider.category || data.service.trim(),
      // There is no payment gateway: pressing Pay at checkout is the payment, so the booking is Paid from the start.
      paymentStatus: 'Paid',
      paymentMethod: data.paymentMethod?.trim() || undefined,
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
      ...this.statusSettlement(existing, data.status, 'Provider'),
      ...(data.stateVersion === undefined ? {} : { stateVersion: data.stateVersion }),
    };
    return this.bookingsRepository.update(id, update)!;
  }

  updateForCaller(id: string, data: UpdateBookingDto, caller: BookingRequestContext): Booking {
    if (caller.role === 'admin') return this.update(id, data);
    if (Object.keys(data).length !== 1 || typeof data.status !== 'string') {
      throw new ForbiddenException('Only a booking status change is allowed for this role.');
    }
    const booking = this.findById(id, caller);
    const transitions: Record<string, Record<string, string[]>> = {
      customer: { Cancelled: ['Pending', 'Accepted'] },
      provider: { Accepted: ['Pending'], Rejected: ['Pending'], Completed: ['Accepted'], Cancelled: ['Accepted'] },
    };
    if (!transitions[caller.role]?.[data.status]?.includes(booking.status)) {
      throw new BadRequestException('This booking status transition is not allowed.');
    }
    return this.bookingsRepository.update(id, this.statusSettlement(booking, data.status, caller.role === 'customer' ? 'Customer' : 'Provider'))!;
  }

  private statusSettlement(booking: Booking, status: string, actor: string): UpdateBookingDto {
    const now = new Date().toISOString();
    if (status === 'Cancelled' || status === 'Rejected') {
      return { status, cancellationActor: actor, cancelledAt: now, ...cancellationSettlement(booking, actor, now) };
    }
    if (status === 'Completed') return { status, receivedDate: now.slice(0, 10), payoutStatus: 'Paid', payoutDate: now.slice(0, 10) };
    return { status };
  }

  delete(id: string): Booking {
    this.validateId(id);
    const booking = this.bookingsRepository.delete(id);
    if (!booking) throw new NotFoundException(`Booking with id "${id}" was not found.`);
    return booking;
  }

  private matchesCaller(booking: Booking, caller: BookingRequestContext): boolean {
    if (caller.role === 'admin') return true;
    if (caller.role === 'customer') {
      return Boolean(caller.userId && booking.customerId === caller.userId);
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
