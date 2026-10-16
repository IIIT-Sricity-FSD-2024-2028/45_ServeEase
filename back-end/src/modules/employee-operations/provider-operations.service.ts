import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PROVIDER_ACCOUNT_STATUSES, VERIFICATION_DECISIONS, providerAccountStatus, providerVerificationStatus } from '../../common/provider-account-status';
import { canonicalProviderId } from '../../common/provider-identity';
import { AuthService } from '../auth/auth.service';
import { AvailabilityService } from '../availability/availability.service';
import { canonicalPaymentStatus } from '../bookings/booking-finance';
import { BookingsRepository } from '../bookings/bookings.repository';
import { CatalogService } from '../catalog/catalog.service';
import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import { StateRepository } from '../state/state.repository';
import { TicketsService } from '../tickets/tickets.service';
import { ProviderVerificationDecisionDto, UpdateProviderStatusDto } from './employee-operations.dto';

type Account = Record<string, any>;
type Actor = { userId: string; role: string; department?: string | null };
const ACCOUNTS_KEY = 'serveEaseData';

const text = (value: unknown): string | null => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());
const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

// Provider Operations workspace (front-end provider-operations.html, provider-operations-detail.html,
// provider-verification-review.html) over the persisted provider accounts in serveEaseData. Responses carry
// only what those pages show: no credentials, addresses, ID-proof types or document file locations.
const UNRECORDED_STATUS = ['', 'not recorded', 'n/a', 'na'];
function verificationRecorded(account: Account): boolean {
  return [account.accountStatus, account.status, account.approvalStatus, account.verificationStatus].some((value) => !UNRECORDED_STATUS.includes(String(value ?? '').trim().toLowerCase())) || typeof account.verified === 'boolean';
}

@Injectable()
export class ProviderOperationsService {
  constructor(
    private readonly state: StateRepository,
    private readonly bookings: BookingsRepository,
    private readonly tickets: TicketsService,
    private readonly catalog: CatalogService,
    private readonly availability: AvailabilityService,
    private readonly auth: AuthService,
    private readonly documentFiles: ProviderDocumentsService,
  ) {}

  overview() {
    const accounts = this.providerAccounts();
    const idCounts = new Map<string, number>();
    accounts.forEach((account) => idCounts.set(String(account.id), (idCounts.get(String(account.id)) || 0) + 1));
    const providers = accounts.map((account) => ({
      ...this.summary(account),
      // A few legacy records share an id; their links also carry the catalog listing to stay unambiguous.
      sharedId: (idCounts.get(String(account.id)) || 0) > 1,
      documentCount: this.documents(account).length,
      serviceCount: this.services(account).length,
    }));
    return {
      providers,
      totals: {
        providers: providers.length,
        services: providers.reduce((sum, provider) => sum + provider.serviceCount, 0),
      },
    };
  }

  // Compact, department-scoped data for the Provider Operations notification bell. It contains provider
  // onboarding/verification work and provider-raised tickets only, not the Support department's full queue.
  providerNotificationFeed() {
    return {
      providers: this.overview().providers,
      tickets: this.tickets.findAllForSupport()
        .filter((ticket) => ticket.raisedByType === 'provider')
        .map((ticket) => ({
          ticketId: ticket.ticketId,
          providerId: text(ticket.providerId || ticket.raisedById),
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })),
    };
  }

  detail(id: string, listing?: string) {
    const account = this.find(id, listing);
    const email = lower(account.email);
    // A provider that registered here has no stored catalog listing: its bookings are recorded against the
    // account id (the derived listing's ownerProviderId), so both ids are matched, canonically, as elsewhere.
    const bookingIds = new Set([text(account.providerCatalogId), String(account.id)]
      .filter((value): value is string => Boolean(value))
      .map((value) => canonicalProviderId(value)));
    const bookings = this.bookings.findAll()
      .filter((booking) => bookingIds.has(canonicalProviderId(String(booking.providerId || ''))))
      .map((booking) => ({
        id: booking.id,
        customer: text(booking.customerName),
        service: text(booking.service),
        date: text(booking.date),
        time: text(booking.time),
        status: text(booking.status),
        paymentStatus: canonicalPaymentStatus(booking),
      }));
    const tickets = this.tickets.findAllForSupport()
      .filter((ticket) => ticket.raisedByType === 'provider'
        && (String(ticket.raisedById || '') === String(account.id) || (email !== '' && lower(ticket.raisedByEmail) === email)))
      .map((ticket) => ({
        ticketId: ticket.ticketId,
        relatedBookingId: text(ticket.relatedBookingId),
        subject: ticket.subject,
        ticketType: ticket.ticketType,
        status: ticket.status,
        createdAt: ticket.createdAt,
      }));
    return {
      provider: {
        ...this.summary(account),
        rejectionReason: text(account.rejectionReason),
        suspensionReason: text(account.suspensionReason),
        adminRemarks: text(account.adminRemarks),
      },
      documents: this.documents(account),
      services: this.services(account),
      bookings,
      availability: this.weeklySchedule(account),
      tickets,
      history: (Array.isArray(account.statusHistory) ? account.statusHistory : []).map((entry: Account) => ({
        dateTime: text(entry.dateTime || entry.date || entry.createdAt),
        action: text(entry.action || entry.type),
        previousStatus: text(entry.previousStatus || entry.from),
        newStatus: text(entry.newStatus || entry.to || entry.status),
        reason: text(entry.reason),
        remarks: text(entry.remarks || entry.note),
        performedBy: text(entry.performedBy || entry.actor || entry.updatedBy),
      })),
    };
  }

  // Approves or rejects a pending verification, writing the same fields the original approveProvider() /
  // rejectProvider() did to the provider account and its approval request. Only providers that are still
  // Under Verification can be decided, so a repeated or stale decision is refused instead of overwriting.
  decideVerification(id: string, listing: string | undefined, input: ProviderVerificationDecisionDto, actor: Actor) {
    const data = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[]; providerApprovalRequests?: Account[] } | undefined;
    const account = this.find(id, listing);
    const previousStatus = providerAccountStatus(account);
    if (previousStatus !== 'Under Verification') {
      throw new ConflictException(`This provider's verification has already been processed (account status: ${previousStatus}).`);
    }
    const reason = (input.reason || '').trim();
    const remarks = (input.remarks || '').trim();
    if (input.decision === 'reject' && reason.length < 5) throw new BadRequestException('A rejection reason of at least 5 characters is required.');
    if (input.decision === 'approve' && !this.documents(account).length) {
      throw new ConflictException('No verification documents are recorded for this provider, so the verification cannot be approved.');
    }

    const next = VERIFICATION_DECISIONS[input.decision];
    const entry = {
      dateTime: new Date().toISOString(),
      action: next.action,
      previousStatus,
      newStatus: next.accountStatus,
      reason: input.decision === 'reject' ? reason : '',
      remarks,
      performedBy: actor.role === 'superuser' ? 'Superuser' : actor.department || 'Employee',
      performedById: String(actor.userId),
    };
    const apply = (record: Account) => {
      record.approvalStatus = next.approvalStatus;
      record.verificationStatus = next.verificationStatus;
      record.accountStatus = next.accountStatus;
      record.status = next.accountStatus;
      record.verified = next.verified;
      record.adminRemarks = remarks;
      if (input.decision === 'reject') record.rejectionReason = reason;
      else delete record.rejectionReason;
      if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
      record.statusHistory.unshift({ ...entry });
    };
    apply(account);
    const email = lower(account.email);
    (Array.isArray(data?.providerApprovalRequests) ? data!.providerApprovalRequests! : [])
      .filter((request) => String(request?.id ?? request?.providerId ?? '') === String(account.id) && (!email || !request.email || lower(request.email) === email))
      .forEach(apply);
    this.state.update(ACCOUNTS_KEY, { value: data as Record<string, unknown> });
    return this.detail(String(account.id), text(account.providerCatalogId) || undefined);
  }

  // Suspends or reactivates a verified provider, writing the fields the original suspendProvider() /
  // activateProvider() wrote. Verification fields are left as they are; repeating the current status is a
  // no-op; providers still under verification or rejected are refused. Suspension ends their sessions.
  setProviderStatus(id: string, listing: string | undefined, input: UpdateProviderStatusDto, actor: Actor) {
    const data = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[]; providerApprovalRequests?: Account[] } | undefined;
    const account = this.find(id, listing);
    const previousStatus = providerAccountStatus(account);
    if (!(PROVIDER_ACCOUNT_STATUSES as readonly string[]).includes(previousStatus)) {
      throw new ConflictException(`Only verified providers can be suspended or activated (account status: ${previousStatus}).`);
    }
    if (previousStatus === input.status) return { ...this.detail(String(account.id), text(account.providerCatalogId) || undefined), changed: false };

    const reason = input.reason.trim();
    const remarks = (input.remarks || '').trim();
    const suspend = input.status === 'Suspended';
    const entry = {
      dateTime: new Date().toISOString(),
      action: suspend ? 'Provider suspended' : 'Provider activated',
      previousStatus,
      newStatus: input.status,
      reason,
      remarks,
      performedBy: actor.role === 'superuser' ? 'Superuser' : actor.department || 'Employee',
      performedById: String(actor.userId),
    };
    const apply = (record: Account) => {
      record.accountStatus = input.status;
      record.status = input.status;
      record.approvalStatus = input.status;
      record.adminRemarks = remarks;
      if (suspend) record.suspensionReason = reason;
      else delete record.suspensionReason;
      if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
      record.statusHistory.unshift({ ...entry });
    };
    apply(account);
    const email = lower(account.email);
    (Array.isArray(data?.providerApprovalRequests) ? data!.providerApprovalRequests! : [])
      .filter((request) => String(request?.id ?? request?.providerId ?? '') === String(account.id) && (!email || !request.email || lower(request.email) === email))
      .forEach(apply);
    this.state.update(ACCOUNTS_KEY, { value: data as Record<string, unknown> });
    if (suspend) this.auth.revokeSessions(String(account.id), 'provider');
    return { ...this.detail(String(account.id), text(account.providerCatalogId) || undefined), changed: true };
  }

  // Provider Operations access to one provider's canonical documents (list, metadata, file, browser import).
  documentList(id: string, listing: string | undefined) {
    return this.documentFiles.list(this.find(id, listing));
  }

  documentMetadata(id: string, listing: string | undefined, documentId: string) {
    return this.documentFiles.metadata(this.find(id, listing), documentId);
  }

  documentFile(id: string, listing: string | undefined, documentId: string) {
    return this.documentFiles.file(this.find(id, listing), documentId);
  }

  importBrowserDocument(id: string, listing: string | undefined, documentId: string, file: Express.Multer.File | undefined, actor: Actor, origin: string | null) {
    return this.documentFiles.importFromBrowser(this.find(id, listing), documentId, file, actor, origin);
  }

  private providerAccounts(): Account[] {
    const value = this.state.findById(ACCOUNTS_KEY)?.value as { users?: Account[] } | undefined;
    return (Array.isArray(value?.users) ? value!.users! : []).filter((account) => account?.role === 'provider');
  }

  private find(id: string, listing?: string): Account {
    let matches = this.providerAccounts().filter((account) => String(account.id) === id);
    if (matches.length > 1 && listing) matches = matches.filter((account) => String(account.providerCatalogId || '') === listing);
    if (!matches.length) throw new NotFoundException(`Provider with id "${id}" was not found.`);
    if (matches.length > 1) throw new ConflictException(`Several provider accounts share id "${id}". Open the provider from the Provider Operations list.`);
    return matches[0];
  }

  private summary(account: Account) {
    const accountStatus = providerAccountStatus(account);
    return {
      id: String(account.id),
      fullName: text(account.fullName || account.name),
      organisationName: text(account.organisationName),
      email: text(account.email),
      phone: text(account.phone),
      serviceType: text(account.serviceType || account.category),
      experience: account.experience ?? null,
      location: text(account.cityName || account.location),
      registrationDate: text(account.resubmittedDate || account.submittedDate || account.registrationDate),
      accountStatus,
      verificationStatus: providerVerificationStatus(accountStatus),
      // True only when the record itself carries a status; the derived default for an unrecorded one is not verification information.
      verificationRecorded: verificationRecorded(account),
      providerCatalogId: text(account.providerCatalogId),
    };
  }

  // Canonical document metadata (provider-documents registry); no paths, storage keys or bytes.
  private documents(account: Account) {
    return this.documentFiles.list(account);
  }

  // Service records through the one account→services mapping the catalog uses (saved records first, a
  // listing's own list only for accounts without records), so the count is the same wherever it is shown.
  private services(account: Account) {
    return this.catalog.servicesForAccount(account).map((service, index) => ({
      id: service.id || `${account.id}:${index + 1}`,
      name: service.name,
      category: service.category,
      subcategory: service.name,
      price: service.price,
      location: service.location,
      status: service.status,
    }));
  }

  private weeklySchedule(account: Account) {
    for (const providerId of [text(account.providerCatalogId), String(account.id)]) {
      if (!providerId) continue;
      try {
        return this.availability.getWeeklySchedule(providerId).weeklySchedule;
      } catch {
        // no schedule recorded under this id
      }
    }
    return null;
  }
}
