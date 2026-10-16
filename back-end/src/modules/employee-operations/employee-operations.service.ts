import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CUSTOMER_ACCOUNT_STATUSES, customerAccountStatus } from '../../common/customer-account-status';
import { AuthService } from '../auth/auth.service';
import { canonicalPaymentStatus } from '../bookings/booking-finance';
import { BookingsRepository } from '../bookings/bookings.repository';
import { StateRepository } from '../state/state.repository';
import { TicketsService } from '../tickets/tickets.service';
import { UpdateCustomerStatusDto } from './employee-operations.dto';

type Account = Record<string, any>;
type Actor = { userId: string; role: string; department?: string | null };
const ACCOUNTS_KEY = 'serveEaseData';

const text = (value: unknown): string | null => (value === undefined || value === null || String(value).trim() === '' ? null : String(value));
const lower = (value: unknown) => String(value || '').trim().toLowerCase();

// Views for the employee Customer Operations workspace (front-end customer-operations*.html) plus the
// customer suspend/activate action (Provider Operations lives in provider-operations.service.ts). Only the
// fields those pages show are returned: no password hashes, documents, addresses or other account internals.
@Injectable()
export class EmployeeOperationsService {
  constructor(
    private readonly state: StateRepository,
    private readonly bookings: BookingsRepository,
    private readonly tickets: TicketsService,
    private readonly auth: AuthService,
  ) {}

  customerOverview() {
    const allBookings = this.bookings.findAll();
    const customers = this.accounts('customer').map((account) => ({
      ...this.customerSummary(account),
      bookings: this.bookingsFor(allBookings, String(account.id), lower(account.email)).length,
    }));
    return {
      customers,
      totals: {
        customers: customers.length,
        bookings: allBookings.length,
        customerTickets: this.tickets.findAllForSupport().filter((ticket) => ticket.raisedByType === 'customer').length,
      },
    };
  }

  customerDetail(id: string) {
    const account = this.accounts('customer').find((item) => String(item.id) === id);
    if (!account) throw new NotFoundException(`Customer with id "${id}" was not found.`);
    const email = lower(account.email);
    const bookings = this.bookingsFor(this.bookings.findAll(), id, email)
      .map((booking) => ({
        id: booking.id,
        service: booking.service,
        provider: booking.provider,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        paymentStatus: canonicalPaymentStatus(booking),
        total: booking.customerTotal ?? booking.amount ?? null,
        createdAt: text(booking.createdAt),
      }));
    const tickets = this.tickets.findAllForSupport()
      .filter((ticket) => ticket.raisedByType === 'customer'
        && (String(ticket.customerId || '') === id || String(ticket.raisedById || '') === id || (email !== '' && lower(ticket.raisedByEmail) === email)))
      .map((ticket) => ({
        ticketId: ticket.ticketId,
        relatedBookingId: text(ticket.relatedBookingId),
        subject: ticket.subject,
        ticketType: ticket.ticketType,
        status: ticket.status,
        createdAt: ticket.createdAt,
      }));
    return { customer: this.customerSummary(account), bookings, tickets };
  }

  // Suspends ('Blocked') or reactivates ('Active') one customer, mirroring the original record update: only
  // the status fields and status history change; role, email, credentials and profile are left as they are.
  // Repeating the current status is a no-op. Suspension also ends that customer's open sessions.
  setCustomerStatus(id: string, input: UpdateCustomerStatusDto, actor: Actor) {
    if (String(actor.userId) === id) throw new ForbiddenException('You cannot change the status of your own account.');
    const data = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[] } | undefined;
    const account = (Array.isArray(data?.users) ? data!.users! : []).find((item) => String(item?.id) === id);
    if (!account) throw new NotFoundException(`Customer with id "${id}" was not found.`);
    if (account.role !== 'customer') throw new ForbiddenException('Only customer accounts can be suspended or activated here.');
    const previousStatus = customerAccountStatus(account);
    if (!(CUSTOMER_ACCOUNT_STATUSES as readonly string[]).includes(previousStatus)) {
      throw new ConflictException(`A customer with account status "${previousStatus}" cannot be suspended or activated here.`);
    }
    if (previousStatus === input.status) return { customer: this.customerSummary(account), changed: false };

    const reason = input.reason.trim();
    const remarks = (input.remarks || '').trim();
    const suspend = input.status === 'Blocked';
    account.accountStatus = input.status;
    account.status = input.status;
    account.blockReason = suspend ? reason : '';
    account.adminRemarks = remarks;
    if (!Array.isArray(account.statusHistory)) account.statusHistory = [];
    account.statusHistory.unshift({
      action: suspend ? 'Customer suspended' : 'Customer activated',
      previousStatus,
      newStatus: input.status,
      reason,
      remarks,
      dateTime: new Date().toISOString(),
      performedBy: actor.role === 'superuser' ? 'Superuser' : actor.department || 'Employee',
      performedById: String(actor.userId),
    });
    this.state.update(ACCOUNTS_KEY, { value: data as Record<string, unknown> });
    if (suspend) this.auth.revokeCustomerSessions(id);
    return { customer: this.customerSummary(account), changed: true };
  }

  // One customer's bookings, matched the way the original pages did: by account id or by registered email.
  private bookingsFor(bookings: Account[], id: string, email: string): Account[] {
    return bookings.filter((booking) => String(booking.customerId || '') === id || (email !== '' && lower(booking.customerEmail) === email));
  }

  private accounts(role: 'customer'): Account[] {
    const value = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[] } | undefined;
    return (Array.isArray(value?.users) ? value!.users! : []).filter((account) => account?.role === role);
  }

  private customerSummary(account: Account) {
    return {
      id: String(account.id),
      fullName: text(account.fullName),
      email: text(account.email),
      phone: text(account.phone),
      registrationDate: text(account.registrationDate),
      status: customerAccountStatus(account),
    };
  }
}
