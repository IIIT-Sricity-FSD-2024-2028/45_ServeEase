import { Injectable } from '@nestjs/common';
import { SupportTicket, TicketPriority, TicketStatus } from './ticket.entity';
import { StateRepository } from '../state/state.repository';

@Injectable()
export class TicketsRepository {
  private readonly tickets: SupportTicket[] = [];
  private readonly stateKey = 'serveEaseCanonicalTickets';

  constructor(private readonly state: StateRepository) {
    const stored = state.findById(this.stateKey);
    if (stored?.value && Array.isArray((stored.value as { tickets?: SupportTicket[] }).tickets)) {
      this.tickets.push(...((stored.value as { tickets: SupportTicket[] }).tickets));
    } else {
      const legacy = state.findById('serveEaseSupportModuleData');
      const legacyTickets = legacy?.value && Array.isArray((legacy.value as { tickets?: unknown[] }).tickets)
        ? (legacy.value as { tickets: unknown[] }).tickets
        : [];
      this.tickets.push(...legacyTickets.map((ticket) => this.fromLegacyTicket(ticket as Record<string, unknown>)));
      if (this.tickets.length) this.persist();
    }
  }

  findAll(): SupportTicket[] {
    return this.tickets;
  }

  findById(id: string): SupportTicket | undefined {
    return this.tickets.find((ticket) => ticket.ticketId === id);
  }

  create(ticket: SupportTicket): SupportTicket {
    this.tickets.unshift(ticket);
    this.persist();
    return ticket;
  }

  update(ticket: SupportTicket): SupportTicket {
    ticket.updatedAt = new Date().toISOString();
    this.persist();
    return ticket;
  }

  private persist(): void {
    this.state.create({ key: this.stateKey, value: { tickets: this.tickets as unknown as Record<string, unknown>[] } });
  }

  private fromLegacyTicket(value: Record<string, unknown>): SupportTicket {
    const status = this.normalizeStatus(value.status);
    const raisedByType = value.raisedByType === 'provider' ? 'provider' : 'customer';
    const now = String(value.createdAtIso || new Date().toISOString());
    const ticketId = String(value.ticketId || value.id || `TICKET-${Date.now()}`);
    return {
      ticketId,
      raisedByType,
      raisedById: String(value.raisedById || value.customerId || ''),
      raisedByName: String(value.raisedByName || value.customerName || value.relatedCustomer || 'User'),
      raisedByEmail: String(value.raisedByEmail || value.email || ''),
      raisedByPhone: String(value.raisedByPhone || value.phone || ''),
      relatedBookingId: String(value.relatedBookingId || value.bookingReference || '') || undefined,
      relatedPaymentId: String(value.relatedPaymentId || '') || undefined,
      providerId: String(value.providerId || '') || undefined,
      providerName: String(value.providerName || '') || undefined,
      customerId: String(value.customerId || '') || undefined,
      customerName: String(value.customerName || value.relatedCustomer || '') || undefined,
      ticketType: String(value.ticketType || value.issueCategory || 'General Support'),
      subject: String(value.subject || value.ticketType || 'Support request'),
      description: String(value.description || ''),
      attachmentUrl: String(value.attachmentUrl || value.attachmentId || '') || undefined,
      priority: this.normalizePriority(value.priority),
      status,
      supportRemarks: String(value.supportRemarks || value.supportUpdate || '') || undefined,
      adminRemarks: String(value.adminRemarks || value.internalRemarks || '') || undefined,
      escalationReason: String(value.escalationReason || '') || undefined,
      assignedSupportId: String(value.assignedSupportId || '') || undefined,
      assignedSupportName: String(value.assignedSupportName || value.assignedTo || '') || undefined,
      createdAt: now,
      updatedAt: String(value.updatedAt || now),
      resolvedAt: String(value.resolvedAt || '') || undefined,
      escalatedAt: String(value.escalatedAt || '') || undefined,
      statusHistory: Array.isArray(value.statusHistory) ? value.statusHistory as any : [{ status, note: 'Migrated from development state.', updatedBy: 'System', updatedAt: now }],
    };
  }

  private normalizeStatus(value: unknown): TicketStatus {
    const status = String(value || '').trim().toLowerCase();
    if (status === 'in progress') return 'In Progress';
    if (status === 'resolved by support') return 'Resolved by Support';
    if (status === 'escalated') return 'Escalated';
    if (status === 'under review') return 'Under Review';
    if (status === 'resolved' || status === 'closed') return 'Resolved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }

  private normalizePriority(value: unknown): TicketPriority {
    const priority = String(value || '').trim();
    return ['Low', 'Medium', 'High', 'Critical'].includes(priority) ? priority as TicketPriority : 'Medium';
  }
}
