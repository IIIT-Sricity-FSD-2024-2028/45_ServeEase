import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupportTicket } from './ticket.entity';
import { TicketsService } from './tickets.service';

const request = (headers: Record<string, string>) => ({ headers }) as never;
const customer = request({ role: 'customer', 'user-id': 'CUS001', 'user-email': 'c@example.com' });
const otherCustomer = request({ role: 'customer', 'user-id': 'CUS002', 'user-email': 'x@example.com' });
const provider = request({ role: 'provider', 'user-id': 'PRO001', 'user-email': 'p@example.com' });
const support = request({ role: 'support', 'user-id': 'EMP-SUP-001', 'user-email': 's@example.com' });

function service() {
  const store: SupportTicket[] = [];
  const repository = {
    findAll: () => store,
    findById: (id: string) => store.find((ticket) => ticket.ticketId === id),
    create: (ticket: SupportTicket) => { store.push(ticket); return ticket; },
    update: (ticket: SupportTicket) => ticket,
  };
  const bookings = { findByIdForSystem: () => ({ id: 'BOOK-1', provider: 'Cleanpro', providerId: 'PRO001', customerName: 'Cus One', customerEmail: 'c@example.com', customerPhone: '1' }) };
  return new TicketsService(repository as never, bookings as never);
}

describe('ticket conversation and support updates', () => {
  it('shows the customer the solution and conversation but never internal remarks', () => {
    const tickets = service();
    const created = tickets.createCustomerTicket({ bookingId: 'BOOK-1', ticketType: 'Payment Issue', subject: 'Charged twice', description: 'I was charged twice.', customerId: 'CUS001', customerName: 'Cus One' } as never, customer);
    tickets.updateStatus(created.ticketId, 'In Progress');
    tickets.updateSupportRemarks(created.ticketId, { remarks: 'Internal: verified duplicate charge.' });
    tickets.resolveBySupport(created.ticketId, { remarks: 'We refunded the duplicate payment.' });
    const [mine] = tickets.findMyCustomerTickets(customer);
    expect(mine.status).toBe('Resolved by Support');
    expect(mine.supportUpdate).toBe('We refunded the duplicate payment.');
    expect(mine.messages).toMatchObject([{ senderType: 'agent', text: 'We refunded the duplicate payment.' }]);
    expect(JSON.stringify(mine)).not.toContain('Internal: verified duplicate charge.');
    expect(tickets.findById(created.ticketId).supportRemarks).toBe('Internal: verified duplicate charge.');
  });

  it('keeps one message when the same solution is saved and then used to resolve', () => {
    const tickets = service();
    const created = tickets.createProviderTicket({ ticketType: 'Payment Not Received', subject: 'No payout', description: 'My payout has not arrived.', providerId: 'PRO001', providerName: 'Cleanpro' } as never, provider);
    tickets.updateStatus(created.ticketId, 'In Progress');
    tickets.saveSolution(created.ticketId, { solution: 'Payout released today.' });
    tickets.saveSolution(created.ticketId, { solution: 'Payout released today.' });
    tickets.resolveBySupport(created.ticketId, { remarks: 'Payout released today.' });
    expect(tickets.findById(created.ticketId).messages).toHaveLength(1);
  });

  it('lets only the owner and support write on a ticket, as the right sender', () => {
    const tickets = service();
    const created = tickets.createCustomerTicket({ bookingId: 'BOOK-1', ticketType: 'Other', subject: 'Help', description: 'Need help please.', customerId: 'CUS001' } as never, customer);
    const afterOwner = tickets.addMessage(created.ticketId, { text: '  Any update?  ' }, customer);
    expect(afterOwner.messages).toMatchObject([{ senderType: 'customer', text: 'Any update?' }]);
    expect(afterOwner).not.toHaveProperty('supportRemarks');
    tickets.addMessage(created.ticketId, { text: 'We are checking.' }, support);
    expect(tickets.findMyCustomerTickets(customer)[0].messages?.map((message) => message.senderType)).toEqual(['customer', 'agent']);
    expect(() => tickets.addMessage(created.ticketId, { text: 'Hi' }, otherCustomer)).toThrow(ForbiddenException);
    expect(() => tickets.addMessage(created.ticketId, { text: 'Hi' }, provider)).toThrow(ForbiddenException);
    expect(() => tickets.addMessage(created.ticketId, { text: '   ' }, customer)).toThrow(BadRequestException);
  });
});
