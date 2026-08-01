import { Injectable } from '@nestjs/common';
import { SupportTicket } from './ticket.entity';

@Injectable()
export class TicketsRepository {
  private readonly tickets: SupportTicket[] = [];

  findAll(): SupportTicket[] {
    return this.tickets;
  }

  findById(id: string): SupportTicket | undefined {
    return this.tickets.find((ticket) => ticket.ticketId === id);
  }

  create(ticket: SupportTicket): SupportTicket {
    this.tickets.unshift(ticket);
    return ticket;
  }

  update(ticket: SupportTicket): SupportTicket {
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
}
