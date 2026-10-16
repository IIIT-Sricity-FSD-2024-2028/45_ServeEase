import { accountServices } from '../catalog/catalog-derivation';
import { ArgumentMetadata, BadRequestException, ConflictException, ExecutionContext, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { RolesGuard } from '../../guards/roles.guard';
import { AuthService } from '../auth/auth.service';
import { StateRepository } from '../state/state.repository';
import { EmployeeOperationsController } from './employee-operations.controller';
import { ProviderVerificationDecisionDto } from './employee-operations.dto';
import { EmployeeOperationsService } from './employee-operations.service';
import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import { ProviderOperationsService } from './provider-operations.service';

// End to end through the real guard, auth service, controller, services and file-backed state repository,
// using a temporary state file with fixture accounts only.
const PASSWORD = 'Pass@123';
const documents = [
  { documentId: 'DOC-PEND-1', documentType: 'ID Proof - Aadhaar', documentName: 'aadhaar.jpg', documentUrl: 'local-document://PROPEND1/DOC-PEND-1', required: true, documentStatus: 'Pending' },
  { documentId: 'DOC-PEND-2', documentType: 'Address Proof', documentName: 'bill.pdf', documentUrl: 'local-document://PROPEND1/DOC-PEND-2', required: true, documentStatus: 'Pending' },
];
const fixtureState = () => [
  {
    key: 'serveEaseData',
    value: {
      users: [
        { id: 'PROPEND1', role: 'provider', fullName: 'Pending One', organisationName: 'Pending Fixers', email: 'pending1@example.test', phone: '9000000101', serviceType: 'Plumbing', experience: 4, cityName: 'Chennai', address: 'Secret Street 4', idProofType: 'PAN', registrationDate: '14/10/2026', approvalStatus: 'Pending Approval', verificationStatus: 'Pending', accountStatus: 'Under Verification', status: 'Under Verification', documents, password: PASSWORD },
        { id: 'PROPEND2', role: 'provider', fullName: 'Pending Two', email: 'pending2@example.test', approvalStatus: 'Pending Approval', accountStatus: 'Under Verification', documents: [], password: PASSWORD },
        { id: 'PROACT', role: 'provider', fullName: 'Active Pro', organisationName: 'Fixers', email: 'active@example.test', providerCatalogId: 'fixers', approvalStatus: 'Active', password: PASSWORD, statusHistory: [{ dateTime: '25-08-2026 01:14 AM', action: 'Provider activated', previousStatus: 'Suspended', newStatus: 'Active', reason: 'ok', remarks: '', performedBy: 'super@example.test' }] },
        { id: 'PRODUP', role: 'provider', fullName: 'Dup A', email: 'dup-a@example.test', providerCatalogId: 'dup-a', accountStatus: 'Active', password: PASSWORD },
        { id: 'PRODUP', role: 'provider', fullName: 'Dup B', email: 'dup-b@example.test', providerCatalogId: 'dup-b', accountStatus: 'Suspended', password: PASSWORD },
        { id: 'PROREJ', role: 'provider', fullName: 'Rejected Pro', email: 'rejected@example.test', approvalStatus: 'Rejected', verificationStatus: 'Rejected', password: PASSWORD },
        { id: 'CUS900', role: 'customer', email: 'customer@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'SU900', role: 'superuser', email: 'super@example.test', password: PASSWORD },
      ],
      providerApprovalRequests: [
        { id: 'PROPEND1', email: 'pending1@example.test', approvalStatus: 'Pending Approval', accountStatus: 'Under Verification' },
        { id: 'PROOTHER', email: 'other@example.test', approvalStatus: 'Pending Approval', accountStatus: 'Under Verification' },
      ],
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    key: 'serveEaseEmployeeModuleData',
    value: {
      employees: [
        { employeeId: 'EMP-CO-9', name: 'Customer Ops', department: 'Customer Operations', password: PASSWORD },
        { employeeId: 'EMP-PO-9', name: 'Provider Ops', department: 'Provider Operations', password: PASSWORD },
        { employeeId: 'EMP-SUP-9', name: 'Support Agent', department: 'Support', password: PASSWORD },
      ],
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('Provider Operations workspace', () => {
  const previousStateFile = process.env.SERVEEASE_STATE_FILE;
  let dir: string;
  let stateFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-provider-ops-'));
    stateFile = join(dir, 'state.json');
    writeFileSync(stateFile, JSON.stringify(fixtureState()), 'utf8');
    process.env.SERVEEASE_STATE_FILE = stateFile;
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previousStateFile === undefined) delete process.env.SERVEEASE_STATE_FILE;
    else process.env.SERVEEASE_STATE_FILE = previousStateFile;
  });

  // One running "server": shared state, auth sessions, guard and controller.
  function server() {
    const state = new StateRepository();
    const auth = new AuthService(state);
    const guard = new RolesGuard(new Reflector(), auth);
    const bookings = [
      { id: 'BOOK-1', providerId: 'fixers', customerName: 'Asha', customerPhone: '9000000001', address: 'Home 1', service: 'Tap Repair', date: '2026-10-20', time: '09:00-12:00', status: 'Pending', paymentStatus: 'Pending' },
      { id: 'BOOK-2', providerId: 'someone-else', customerName: 'Ravi', service: 'Painting', date: '2026-10-21', time: '09:00-12:00', status: 'Completed', paymentStatus: 'Paid' },
    ];
    const tickets = [
      { ticketId: 'TKT-P1', raisedByType: 'provider', raisedById: 'PROACT', raisedByEmail: 'active@example.test', relatedBookingId: 'BOOK-1', subject: 'Payout', ticketType: 'Payment Not Received', status: 'Open', createdAt: '2026-10-15', description: 'private note' },
      { ticketId: 'TKT-C1', raisedByType: 'customer', raisedById: 'CUS900', subject: 'Late', ticketType: 'Late Arrival', status: 'Open', createdAt: '2026-10-15' },
    ];
    const catalog = { servicesForAccount: (account: Record<string, unknown>) => accountServices(account, [account], catalog.findAll().providers as never, []), findAll: () => ({ providers: [{ id: 'fixers', category: 'Plumbing', location: 'Chennai', services: [{ id: 'S1', name: 'Tap Repair', category: 'Plumbing', price: 300, status: 'Active' }, { id: 'S2', name: 'Pipe Fitting', category: 'Plumbing', price: 450, status: 'Active' }] }] }) };
    const availability = { getWeeklySchedule: (id: string) => { if (id !== 'fixers') throw new NotFoundException(); return { providerId: id, weeklySchedule: { monday: ['09:00-12:00'], tuesday: [] } }; } };
    const providers = new ProviderOperationsService(state, { findAll: () => bookings } as never, { findAllForSupport: () => tickets } as never, catalog as never, availability as never, auth, new ProviderDocumentsService(state));
    const customers = new EmployeeOperationsService(state, { findAll: () => bookings } as never, { findAllForSupport: () => tickets } as never, auth);
    const controller = new EmployeeOperationsController(customers, providers);
    const employee = (employeeId: string, department: string) => auth.login({ role: 'employee', employeeId, department, password: PASSWORD }).token;
    const login = (role: string, email: string) => auth.login({ role, email, password: PASSWORD }).token;

    const guarded = (method: string, token: string, headers: Record<string, string> = {}) => {
      const request = { headers: { ...headers, authorization: `Bearer ${token}` } } as Record<string, any>;
      const context = {
        getHandler: () => (EmployeeOperationsController.prototype as unknown as Record<string, unknown>)[method],
        getClass: () => EmployeeOperationsController,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      guard.canActivate(context);
      return request;
    };
    const overview = (token: string) => { guarded('providers', token); return controller.providers().data; };
    const detail = (token: string, id: string, listing?: string) => { guarded('provider', token); return controller.provider(id, listing).data; };
    const decide = (token: string, id: string, body: Partial<ProviderVerificationDecisionDto>, listing?: string, headers?: Record<string, string>) => {
      const request = guarded('decideProviderVerification', token, headers);
      return controller.decideProviderVerification(id, body as ProviderVerificationDecisionDto, request as never, listing).data;
    };
    const data = () => state.findById('serveEaseData')!.value as { users: Record<string, any>[]; providerApprovalRequests: Record<string, any>[] };
    const record = (id: string) => data().users.find((user) => user.id === id)!;
    return { overview, detail, decide, record, data, employee, login };
  }
  const denied = (action: () => unknown) => { try { action(); return false; } catch (error) { if (error instanceof ForbiddenException) return true; throw error; } };

  it('lists every provider with the original page\'s statuses and counts, without credentials or private fields', () => {
    const { overview, employee } = server();
    const result = overview(employee('EMP-PO-9', 'Provider Operations'));
    const byName = Object.fromEntries(result.providers.map((provider) => [provider.fullName, provider]));
    expect(byName['Pending One']).toMatchObject({ id: 'PROPEND1', accountStatus: 'Under Verification', verificationStatus: 'Pending', documentCount: 2, serviceCount: 0, location: 'Chennai', sharedId: false });
    expect(byName['Active Pro']).toMatchObject({ accountStatus: 'Active', verificationStatus: 'Verified', serviceCount: 2 });
    expect(byName['Dup B']).toMatchObject({ id: 'PRODUP', accountStatus: 'Suspended', sharedId: true, providerCatalogId: 'dup-b' });
    expect(byName['Rejected Pro']).toMatchObject({ accountStatus: 'Verification Rejected', verificationStatus: 'Rejected' });
    expect(result.totals).toEqual({ providers: 6, services: 2 });
    expect(JSON.stringify(result)).not.toMatch(/password|Pass@123|Secret Street|PAN|local-document|documentUrl/);
  });

  it('returns one provider with documents (metadata only), services, bookings, availability, tickets and history', () => {
    const { detail, employee } = server();
    const token = employee('EMP-PO-9', 'Provider Operations');
    const active = detail(token, 'PROACT');
    expect(active.services.map((service) => service.name)).toEqual(['Tap Repair', 'Pipe Fitting']);
    expect(active.bookings).toEqual([{ id: 'BOOK-1', customer: 'Asha', service: 'Tap Repair', date: '2026-10-20', time: '09:00-12:00', status: 'Pending', paymentStatus: 'Pending' }]);
    expect(active.availability).toEqual({ monday: ['09:00-12:00'], tuesday: [] });
    expect(active.tickets.map((ticket) => ticket.ticketId)).toEqual(['TKT-P1']);
    expect(active.history[0]).toEqual({ dateTime: '25-08-2026 01:14 AM', action: 'Provider activated', previousStatus: 'Suspended', newStatus: 'Active', reason: 'ok', remarks: null, performedBy: 'super@example.test' });
    expect(JSON.stringify(active)).not.toMatch(/9000000001|Home 1|private note/);

    const pending = detail(token, 'PROPEND1');
    expect(pending.documents).toEqual([
      expect.objectContaining({ documentId: 'DOC-PEND-1', documentType: 'ID Proof - Aadhaar', documentName: 'aadhaar.jpg', documentStatus: 'Pending', required: true, recordOrigin: 'account', state: 'awaiting-browser-import', hasFile: false, fileType: null }),
      expect.objectContaining({ documentId: 'DOC-PEND-2', documentType: 'Address Proof', documentName: 'bill.pdf', documentStatus: 'Pending', required: true, recordOrigin: 'account', state: 'awaiting-browser-import', hasFile: false, fileType: null }),
    ]);
    expect(pending.availability).toBeNull();
    expect(JSON.stringify(pending)).not.toMatch(/password|Secret Street|PAN|local-document/);
  });

  it('handles invalid, missing and shared provider ids', () => {
    const { detail, employee } = server();
    const token = employee('EMP-PO-9', 'Provider Operations');
    expect(() => detail(token, '../PROACT')).toThrow(BadRequestException);
    expect(() => detail(token, 'PRO404')).toThrow(NotFoundException);
    expect(() => detail(token, 'CUS900')).toThrow(NotFoundException);
    expect(() => detail(token, 'PRODUP')).toThrow(ConflictException);
    expect(detail(token, 'PRODUP', 'dup-b').provider.fullName).toBe('Dup B');
    expect(() => detail(token, 'PROACT', 'bad listing!')).toThrow(BadRequestException);
  });

  it('approves a pending verification, persists it to the account and its approval request, and survives a restart', () => {
    const first = server();
    const token = first.employee('EMP-PO-9', 'Provider Operations');
    const before = { ...first.record('PROPEND1') };
    const result = first.decide(token, 'PROPEND1', { decision: 'approve', remarks: 'Documents match registration' });
    expect(result.provider).toMatchObject({ id: 'PROPEND1', accountStatus: 'Active', verificationStatus: 'Verified', adminRemarks: 'Documents match registration', rejectionReason: null });
    expect(result.history[0]).toMatchObject({ action: 'Verification approved', previousStatus: 'Under Verification', newStatus: 'Active', performedBy: 'Provider Operations' });
    expect(JSON.stringify(result)).not.toMatch(/password|Secret Street|PAN|local-document|performedById/);

    const account = first.record('PROPEND1');
    expect(account).toMatchObject({ approvalStatus: 'Active', verificationStatus: 'Verified', accountStatus: 'Active', status: 'Active', verified: true });
    expect(account.statusHistory[0]).toMatchObject({ performedById: 'EMP-PO-9' });
    for (const field of ['role', 'email', 'password', 'fullName', 'phone', 'address', 'idProofType', 'documents', 'providerCatalogId']) expect(account[field]).toEqual(before[field]);
    expect(first.data().providerApprovalRequests[0]).toMatchObject({ id: 'PROPEND1', approvalStatus: 'Active', accountStatus: 'Active' });
    expect(first.data().providerApprovalRequests[1]).toMatchObject({ id: 'PROOTHER', approvalStatus: 'Pending Approval' });

    const onDisk = JSON.parse(readFileSync(stateFile, 'utf8')) as Array<{ key: string; value: { users: Record<string, any>[] } }>;
    expect(onDisk.find((entry) => entry.key === 'serveEaseData')!.value.users.find((user) => user.id === 'PROPEND1')).toMatchObject({ accountStatus: 'Active', role: 'provider' });
    const restarted = server();
    expect(restarted.detail(restarted.employee('EMP-PO-9', 'Provider Operations'), 'PROPEND1').provider.accountStatus).toBe('Active');
    expect(restarted.login('provider', 'pending1@example.test')).toEqual(expect.any(String));
  });

  it('rejects with a required reason and refuses repeated or stale decisions without changing state', () => {
    const { decide, record, employee } = server();
    const token = employee('EMP-PO-9', 'Provider Operations');
    expect(() => decide(token, 'PROPEND1', { decision: 'reject', reason: '     ' })).toThrow('A rejection reason of at least 5 characters is required.');
    const rejected = decide(token, 'PROPEND1', { decision: 'reject', reason: 'Address proof is unreadable', remarks: 'Asked to resubmit' });
    expect(rejected.provider).toMatchObject({ accountStatus: 'Verification Rejected', verificationStatus: 'Rejected', rejectionReason: 'Address proof is unreadable' });
    expect(record('PROPEND1')).toMatchObject({ approvalStatus: 'Rejected', verificationStatus: 'Rejected', accountStatus: 'Verification Rejected', verified: false });

    const historyLength = record('PROPEND1').statusHistory.length;
    expect(() => decide(token, 'PROPEND1', { decision: 'reject', reason: 'Rejected again please' })).toThrow(ConflictException);
    expect(() => decide(token, 'PROPEND1', { decision: 'approve' })).toThrow(ConflictException);
    expect(() => decide(token, 'PROACT', { decision: 'reject', reason: 'Not pending anymore' })).toThrow(ConflictException);
    expect(() => decide(token, 'PROREJ', { decision: 'approve' })).toThrow(ConflictException);
    expect(record('PROPEND1').statusHistory).toHaveLength(historyLength);
    expect(record('PROACT').approvalStatus).toBe('Active');
  });

  it('will not approve a provider with no recorded documents', () => {
    const { decide, record, employee } = server();
    expect(() => decide(employee('EMP-PO-9', 'Provider Operations'), 'PROPEND2', { decision: 'approve' })).toThrow('No verification documents are recorded');
    expect(record('PROPEND2').accountStatus).toBe('Under Verification');
  });

  it('lets a superuser decide, recorded as the superuser', () => {
    const { decide, record, login } = server();
    decide(login('superuser', 'super@example.test'), 'PROPEND1', { decision: 'approve' });
    expect(record('PROPEND1').statusHistory[0]).toMatchObject({ performedBy: 'Superuser', performedById: 'SU900' });
  });

  it('denies Customer Operations, Support, customers and providers on every Provider Operations endpoint, even with spoofed headers', () => {
    const { overview, detail, decide, record, employee, login } = server();
    const spoof = { role: 'admin', department: 'Provider Operations', 'user-id': 'SU900' };
    for (const token of [employee('EMP-CO-9', 'Customer Operations'), employee('EMP-SUP-9', 'Support'), login('customer', 'customer@example.test'), login('provider', 'active@example.test')]) {
      expect(denied(() => overview(token))).toBe(true);
      expect(denied(() => detail(token, 'PROPEND1'))).toBe(true);
      expect(denied(() => decide(token, 'PROPEND1', { decision: 'approve' }))).toBe(true);
      expect(denied(() => decide(token, 'PROPEND1', { decision: 'approve' }, undefined, spoof))).toBe(true);
    }
    expect(record('PROPEND1').accountStatus).toBe('Under Verification');
  });

  it('validates the decision body and refuses extra fields', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const meta: ArgumentMetadata = { type: 'body', metatype: ProviderVerificationDecisionDto };
    await expect(pipe.transform({ decision: 'approve' }, meta)).resolves.toBeInstanceOf(ProviderVerificationDecisionDto);
    await expect(pipe.transform({ decision: 'approve', remarks: 'ok' }, meta)).resolves.toBeInstanceOf(ProviderVerificationDecisionDto);
    await expect(pipe.transform({ decision: 'reject', reason: 'Blurred ID proof' }, meta)).resolves.toBeInstanceOf(ProviderVerificationDecisionDto);
    for (const body of [
      {},
      { decision: 'suspend' },
      { decision: 'Approve' },
      { decision: 'reject' },
      { decision: 'reject', reason: 'no' },
      { decision: 'reject', reason: 'x'.repeat(301) },
      { decision: 'approve', remarks: 'x'.repeat(501) },
      { decision: 'approve', accountStatus: 'Active' },
      { decision: 'approve', role: 'superuser' },
    ]) {
      await expect(pipe.transform(body, meta)).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
