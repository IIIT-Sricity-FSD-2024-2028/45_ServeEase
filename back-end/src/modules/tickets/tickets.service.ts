import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from '../bookings/bookings.service';
import { CreateCustomerTicketDto, CreateProviderTicketDto, TicketFinalDecisionDto, TicketRemarksDto } from './dto/ticket.dto';
import { SupportTicket, TicketFinalDecision, TicketPriority, TicketStatus } from './ticket.entity';
import { TicketsRepository } from './tickets.repository';

@Injectable()
export class TicketsService {
  private sequence = 1000;

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly bookingsService: BookingsService,
  ) {}

  createCustomerTicket(data: CreateCustomerTicketDto, request: Request): SupportTicket {
    const booking = this.findBookingOrCreateSnapshot(data);
    const headerEmail = this.singleHeader(request.headers['user-email']);
    const headerUserId = this.singleHeader(request.headers['user-id']);

    if (headerEmail && booking.customerEmail && String(booking.customerEmail).includes('@') && headerEmail.toLowerCase() !== booking.customerEmail.toLowerCase()) {
      throw new ForbiddenException('You can raise tickets only for your own bookings.');
    }

    const now = new Date().toISOString();
    const priority = this.defaultPriority(data.ticketType);
    const ticket: SupportTicket = {
      ticketId: this.nextTicketId(),
      raisedByType: 'customer',
      raisedById: data.customerId || headerUserId || booking.customerEmail || 'CUS001',
      raisedByName: data.customerName || booking.customerName || 'Customer',
      raisedByEmail: headerEmail || booking.customerEmail || '',
      raisedByPhone: booking.customerPhone || '',
      relatedBookingId: data.bookingId,
      providerId: booking.providerId || this.slug(booking.provider),
      providerName: booking.provider || 'ServeEase Provider',
      customerId: data.customerId || headerUserId || booking.customerEmail || 'CUS001',
      customerName: data.customerName || booking.customerName || 'Customer',
      ticketType: data.ticketType,
      subject: data.subject || data.ticketType,
      description: data.description,
      attachmentUrl: data.attachmentUrl,
      priority,
      status: 'Pending',
      escalationReason: '',
      assignedSupportId: 'SUP001',
      assignedSupportName: 'Priya Sharma',
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'Pending',
          note: 'Ticket created by customer.',
          updatedBy: 'Customer',
          updatedAt: now,
        },
      ],
    };

    return this.ticketsRepository.create(ticket);
  }

  createProviderTicket(data: CreateProviderTicketDto, request: Request): SupportTicket {
    const headerEmail = this.singleHeader(request.headers['user-email']);
    const headerUserId = this.singleHeader(request.headers['user-id']);
    const now = new Date().toISOString();
    const priority = data.priority || this.defaultPriority(data.ticketType);
    const providerName = data.providerName || headerEmail || 'Provider';
    const ticket: SupportTicket = {
      ticketId: this.nextTicketId('PT'),
      raisedByType: 'provider',
      raisedById: data.providerId || headerUserId || headerEmail || 'PROVIDER',
      raisedByName: providerName,
      raisedByEmail: headerEmail || '',
      raisedByPhone: '',
      relatedBookingId: data.relatedBookingId,
      relatedPaymentId: data.relatedPaymentId,
      providerId: data.providerId || headerUserId || '',
      providerName,
      customerName: data.customerName || '',
      ticketType: data.ticketType,
      subject: data.subject,
      description: data.description,
      attachmentUrl: data.attachmentUrl,
      priority,
      status: 'Pending',
      escalationReason: '',
      assignedSupportId: 'SUP001',
      assignedSupportName: 'Priya Sharma',
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'Pending',
          note: 'Ticket created by provider.',
          updatedBy: 'Provider',
          updatedAt: now,
        },
      ],
    };

    return this.ticketsRepository.create(ticket);
  }

  findMyCustomerTickets(request: Request): SupportTicket[] {
    const email = this.singleHeader(request.headers['user-email']);
    const userId = this.singleHeader(request.headers['user-id']);
    return this.sortLatest(this.ticketsRepository.findAll().filter((ticket) => {
      if (ticket.raisedByType !== 'customer') return false;
      if (!email && !userId) return true;
      return ticket.raisedById === userId || ticket.raisedByEmail.toLowerCase() === email.toLowerCase();
    }));
  }

  findMyProviderTickets(request: Request): SupportTicket[] {
    const email = this.singleHeader(request.headers['user-email']);
    const userId = this.singleHeader(request.headers['user-id']);
    return this.sortLatest(this.ticketsRepository.findAll().filter((ticket) => {
      if (ticket.raisedByType !== 'provider') return false;
      if (!email && !userId) return true;
      return ticket.raisedById === userId || ticket.raisedByEmail.toLowerCase() === email.toLowerCase();
    }));
  }

  findVisibleTicket(id: string, request: Request): SupportTicket {
    const ticket = this.findById(id);
    const role = this.singleHeader(request.headers.role);
    if (['support', 'admin', 'superuser'].includes(role)) return ticket;
    const email = this.singleHeader(request.headers['user-email']);
    const userId = this.singleHeader(request.headers['user-id']);
    if ((email || userId) && ticket.raisedById !== userId && ticket.raisedByEmail.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('You can view only your own tickets.');
    }
    return ticket;
  }

  findAllForSupport(): SupportTicket[] {
    return this.sortLatest(this.ticketsRepository.findAll());
  }

  findEscalatedForAdmin(): SupportTicket[] {
    return this.sortLatest(this.ticketsRepository.findAll().filter((ticket) => {
      return ['Escalated', 'Under Review'].includes(ticket.status);
    }));
  }

  findById(id: string): SupportTicket {
    const ticket = this.ticketsRepository.findById(id);
    if (!ticket) throw new NotFoundException(`Ticket with id "${id}" was not found.`);
    return ticket;
  }

  updateStatus(id: string, status: TicketStatus): SupportTicket {
    const ticket = this.ensureSupportEditable(this.findById(id));
    if (ticket.status === 'Pending' && status !== 'In Progress') {
      throw new BadRequestException('Pending tickets must move to In Progress before support can resolve them.');
    }
    ticket.status = status;
    this.addHistory(ticket, status, `Support moved ticket to ${status}.`, 'Support');
    return this.ticketsRepository.update(ticket);
  }

  updateSupportRemarks(id: string, data: TicketRemarksDto): SupportTicket {
    const ticket = this.ensureSupportEditable(this.findById(id));
    ticket.supportRemarks = data.remarks;
    this.addHistory(ticket, ticket.status, 'Support investigation remarks updated.', 'Support');
    return this.ticketsRepository.update(ticket);
  }

  updatePriority(id: string, priority: TicketPriority): SupportTicket {
    const ticket = this.ensureSupportEditable(this.findById(id));
    ticket.priority = priority;
    if (priority === 'Critical') {
      ticket.status = 'Escalated';
      ticket.escalatedAt = new Date().toISOString();
      ticket.escalationReason = 'Critical priority ticket auto-escalated to Admin.';
      this.addHistory(ticket, 'Escalated', ticket.escalationReason, 'System');
    } else {
      this.addHistory(ticket, ticket.status, `Priority assigned as ${priority}.`, 'Support');
    }
    return this.ticketsRepository.update(ticket);
  }

  resolveBySupport(id: string, data: TicketRemarksDto): SupportTicket {
    const ticket = this.ensureSupportEditable(this.findById(id));
    if (ticket.status !== 'In Progress') {
      throw new BadRequestException('Support can resolve only tickets that are In Progress.');
    }
    ticket.supportRemarks = data.remarks;
    ticket.status = 'Resolved by Support';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = 'Support';
    this.addHistory(ticket, 'Resolved by Support', data.remarks, 'Support');
    return this.ticketsRepository.update(ticket);
  }

  escalate(id: string, data: TicketRemarksDto): SupportTicket {
    const ticket = this.ensureSupportEditable(this.findById(id));
    ticket.supportRemarks = data.remarks;
    ticket.escalationReason = data.remarks;
    ticket.status = 'Escalated';
    ticket.escalatedAt = new Date().toISOString();
    this.addHistory(ticket, 'Escalated', data.remarks, 'Support');
    return this.ticketsRepository.update(ticket);
  }

  adminRemarks(id: string, data: TicketRemarksDto): SupportTicket {
    const ticket = this.ensureAdminEditable(this.findById(id));
    ticket.adminRemarks = data.remarks;
    this.addHistory(ticket, ticket.status, 'Admin remarks updated.', 'Admin');
    return this.ticketsRepository.update(ticket);
  }

  finalDecision(id: string, data: TicketFinalDecisionDto): SupportTicket {
    const ticket = this.ensureAdminEditable(this.findById(id));
    ticket.finalDecision = data.finalDecision;
    ticket.adminRemarks = data.adminRemarks;
    ticket.status = this.decisionStatus(data.finalDecision);
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = 'Admin';
    this.addHistory(ticket, ticket.status, `${data.finalDecision}: ${data.adminRemarks}`, 'Admin');
    return this.ticketsRepository.update(ticket);
  }

  resolve(id: string, data: TicketFinalDecisionDto): SupportTicket {
    return this.finalDecision(id, data);
  }

  reject(id: string, data: TicketFinalDecisionDto): SupportTicket {
    const ticket = this.finalDecision(id, { ...data, finalDecision: data.finalDecision || 'Ticket Rejected' as TicketFinalDecision });
    ticket.status = 'Rejected';
    return this.ticketsRepository.update(ticket);
  }

  private findBookingOrCreateSnapshot(data: CreateCustomerTicketDto) {
    try {
      return this.bookingsService.findById(data.bookingId);
    } catch (error) {
      return {
        id: data.bookingId,
        service: 'Service Booking',
        provider: 'ServeEase Provider',
        providerId: 'serveease-provider',
        customerName: data.customerName || 'Customer',
        customerPhone: '',
        customerEmail: data.customerId || '',
      };
    }
  }

  private ensureSupportEditable(ticket: SupportTicket): SupportTicket {
    if (['Resolved by Support', 'Escalated', 'Under Review', 'Resolved', 'Rejected'].includes(ticket.status)) {
      throw new BadRequestException('This ticket is no longer editable by support.');
    }
    return ticket;
  }

  private ensureAdminEditable(ticket: SupportTicket): SupportTicket {
    if (!['Escalated', 'Under Review'].includes(ticket.status)) {
      throw new BadRequestException('Admin can take final decisions only on escalated tickets.');
    }
    if (ticket.status === 'Escalated') {
      ticket.status = 'Under Review';
      this.addHistory(ticket, 'Under Review', 'Admin started review.', 'Admin');
    }
    return ticket;
  }

  private decisionStatus(decision: TicketFinalDecision): TicketStatus {
    return decision === 'Ticket Rejected' || decision === 'Refund Rejected' ? 'Rejected' : 'Resolved';
  }

  private addHistory(ticket: SupportTicket, status: TicketStatus, note: string, updatedBy: string) {
    ticket.statusHistory.unshift({ status, note, updatedBy, updatedAt: new Date().toISOString() });
  }

  private defaultPriority(type: string): TicketPriority {
    if (['Safety Concern', 'Fraud'].includes(type)) return 'Critical';
    if (['Payment Issue', 'Refund Request', 'Provider Misbehavior', 'Misbehavior', 'Payment Not Received', 'Account Suspension Appeal'].includes(type)) return 'High';
    if (['Late Arrival', 'Minor Delay'].includes(type)) return 'Low';
    return 'Medium';
  }

  private nextTicketId(prefix = 'TKT'): string {
    this.sequence += 1;
    return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${this.sequence}`;
  }

  private slug(value: string): string {
    return String(value || 'provider').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private sortLatest(tickets: SupportTicket[]): SupportTicket[] {
    return [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private singleHeader(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value || '';
  }
}
