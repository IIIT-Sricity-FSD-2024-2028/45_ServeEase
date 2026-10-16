import { NotFoundException } from '@nestjs/common';
import { EmployeeOperationsService } from './employee-operations.service';

function service() {
  const users = [
    { id: 'CUS1', role: 'customer', fullName: 'Asha', email: 'Asha@Example.test', phone: '9000000001', cityName: 'Chennai', registrationDate: '01/01/2026', passwordHash: 'salt:hash', password: 'legacy' },
    { id: 'CUS2', role: 'customer', fullName: 'Ravi', email: 'ravi@example.test', accountStatus: 'Blocked' },
    { id: 'PRO1', role: 'provider', fullName: 'Pro One', organisationName: 'Fixers', email: 'pro@example.test', providerCatalogId: 'fixers', approvalStatus: 'Approved', accountStatus: 'Active', documents: [{ fileUrl: '/uploads/x' }], address: 'Street 1', idProofType: 'PAN', passwordHash: 'salt:hash' },
    { id: 'SU1', role: 'superuser', email: 'super@example.test' },
  ];
  const bookings = [
    { id: 'BOOK-1', customerId: 'CUS1', customerEmail: 'asha@example.test', service: 'AC Repair', provider: 'Fixers', date: '2026-10-20', time: '09:00-12:00', status: 'Pending', paymentStatus: 'Pending', customerTotal: 599, customerPhone: '9000000001', address: 'Home' },
    { id: 'BOOK-2', customerEmail: 'ASHA@example.test', service: 'Cleaning', provider: 'Fixers', date: '2026-10-21', time: '09:00-12:00', status: 'Completed', amount: 400 },
    { id: 'BOOK-3', customerId: 'CUS2', customerEmail: 'ravi@example.test', service: 'Painting', provider: 'Fixers', date: '2026-10-22', time: '09:00-12:00', status: 'Pending' },
  ];
  const tickets = [
    { ticketId: 'TKT-1', raisedByType: 'customer', customerId: 'CUS1', raisedById: 'CUS1', raisedByEmail: 'asha@example.test', relatedBookingId: 'BOOK-1', subject: 'Late', ticketType: 'Late Arrival', status: 'Pending', createdAt: '2026-10-15', description: 'private details', supportRemarks: 'internal' },
    { ticketId: 'TKT-2', raisedByType: 'provider', raisedById: 'PRO1', subject: 'Payout', ticketType: 'Payment Not Received', status: 'Pending', createdAt: '2026-10-15' },
  ];
  const state = { findById: (key: string) => (key === 'serveEaseData' ? { value: { users } } : undefined) };
  return new EmployeeOperationsService(
    state as never,
    { findAll: () => bookings } as never,
    { findAllForSupport: () => tickets } as never,
    { revokeCustomerSessions: jest.fn() } as never,
  );
}

describe('EmployeeOperationsService', () => {
  it('lists only customer accounts with the fields Customer Operations shows', () => {
    const { customers, totals } = service().customerOverview();
    expect(customers).toEqual([
      // CUS1 records no status: a customer account without one is Active, as it always was on the original site.
      { id: 'CUS1', fullName: 'Asha', email: 'Asha@Example.test', phone: '9000000001', registrationDate: '01/01/2026', status: 'Active', bookings: 2 },
      { id: 'CUS2', fullName: 'Ravi', email: 'ravi@example.test', phone: null, registrationDate: null, status: 'Blocked', bookings: 1 },
    ]);
    expect(totals).toEqual({ customers: 2, bookings: 3, customerTickets: 1 });
    expect(JSON.stringify(customers)).not.toMatch(/password|hash/i);
  });

  it('returns one customer with only their bookings and tickets, without internal ticket notes', () => {
    const detail = service().customerDetail('CUS1');
    expect(detail.customer.id).toBe('CUS1');
    expect(detail.bookings.map((booking) => booking.id)).toEqual(['BOOK-1', 'BOOK-2']);
    expect(detail.bookings[0]).toEqual({ id: 'BOOK-1', service: 'AC Repair', provider: 'Fixers', date: '2026-10-20', time: '09:00-12:00', status: 'Pending', paymentStatus: 'Paid', total: 599, createdAt: null });
    expect(detail.bookings[1].total).toBe(400);
    expect(detail.tickets).toEqual([{ ticketId: 'TKT-1', relatedBookingId: 'BOOK-1', subject: 'Late', ticketType: 'Late Arrival', status: 'Pending', createdAt: '2026-10-15' }]);
    expect(JSON.stringify(detail)).not.toMatch(/private details|internal|customerPhone|Home/);
  });

  it('does not treat providers or superusers as customers', () => {
    expect(() => service().customerDetail('PRO1')).toThrow(NotFoundException);
    expect(() => service().customerDetail('SU1')).toThrow(NotFoundException);
  });
});
