import { ArgumentMetadata, BadRequestException, ConflictException, ExecutionContext, ForbiddenException, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { RolesGuard } from '../../guards/roles.guard';
import { AuthService } from '../auth/auth.service';
import { BookingsController } from '../bookings/bookings.controller';
import { StateRepository } from '../state/state.repository';
import { TicketsController } from '../tickets/tickets.controller';
import { EmployeeOperationsController } from './employee-operations.controller';
import { UpdateCustomerStatusDto } from './employee-operations.dto';
import { EmployeeOperationsService } from './employee-operations.service';

// End to end through the real guard, auth service, controller, service and file-backed state repository,
// using a temporary state file with fixture accounts only.
const PASSWORD = 'Pass@123';
const fixtureState = () => [
  {
    key: 'serveEaseData',
    value: {
      users: [
        { id: 'CUS900', role: 'customer', fullName: 'Asha Fixture', email: 'asha@example.test', phone: '9000000901', location: 'Chennai', registrationDate: '01/01/2026', accountStatus: 'Active', status: 'Active', password: PASSWORD },
        { id: 'CUS901', role: 'customer', fullName: 'Ravi Fixture', email: 'ravi@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'CUS902', role: 'customer', fullName: 'Legacy Fixture', email: 'legacy@example.test', password: PASSWORD },
        { id: 'CUS903', role: 'customer', fullName: 'Odd Fixture', email: 'odd@example.test', accountStatus: 'Deleted', password: PASSWORD },
        { id: 'PRO900', role: 'provider', fullName: 'Pro Fixture', email: 'pro@example.test', accountStatus: 'Active', password: PASSWORD },
        { id: 'SU900', role: 'superuser', email: 'super@example.test', password: PASSWORD },
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

describe('Customer suspend / activate', () => {
  const previousStateFile = process.env.SERVEEASE_STATE_FILE;
  let dir: string;
  let stateFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'serveease-customer-status-'));
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
    const service = new EmployeeOperationsService(
      state,
      { findAll: () => [] } as never,
      { findAllForSupport: () => [] } as never,
      auth,
    );
    const controller = new EmployeeOperationsController(service, {} as never);
    const employee = (employeeId: string, department: string) => auth.login({ role: 'employee', employeeId, department, password: PASSWORD }).token;
    const login = (role: string, email: string) => auth.login({ role, email, password: PASSWORD }).token;

    // Runs the guard for a route; returns the request (with the session principal) when it is allowed.
    const guarded = (target: { prototype: object }, method: string, token: string, headers: Record<string, string> = {}) => {
      const request = { headers: { ...headers, authorization: `Bearer ${token}` } } as Record<string, any>;
      const context = {
        getHandler: () => (target.prototype as Record<string, unknown>)[method],
        getClass: () => target,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      guard.canActivate(context);
      return request;
    };
    const setStatus = (token: string, id: string, body: Partial<UpdateCustomerStatusDto>, headers?: Record<string, string>) => {
      const request = guarded(EmployeeOperationsController, 'updateCustomerStatus', token, headers);
      return controller.updateCustomerStatus(id, { reason: 'Policy review', ...body } as UpdateCustomerStatusDto, request as never).data;
    };
    const record = (id: string) => (state.findById('serveEaseData')!.value as { users: Record<string, any>[] }).users.find((user) => user.id === id)!;
    return { auth, guarded, setStatus, record, employee, login };
  }
  const denied = (action: () => unknown) => { try { action(); return false; } catch (error) { if (error instanceof ForbiddenException) return true; throw error; } };

  it('lets Customer Operations suspend and reactivate a customer, changing only the status fields', () => {
    const { setStatus, record, employee } = server();
    const coToken = employee('EMP-CO-9', 'Customer Operations');
    const before = { ...record('CUS900') };

    const suspended = setStatus(coToken, 'CUS900', { status: 'Blocked', reason: '  Chargeback investigation  ', remarks: 'Raised by finance' });
    expect(suspended).toEqual({ changed: true, customer: { id: 'CUS900', fullName: 'Asha Fixture', email: 'asha@example.test', phone: '9000000901', location: 'Chennai', registrationDate: '01/01/2026', status: 'Blocked' } });
    expect(JSON.stringify(suspended)).not.toMatch(/password|hash|token|statusHistory|blockReason/i);

    const after = record('CUS900');
    expect(after).toMatchObject({ accountStatus: 'Blocked', status: 'Blocked', blockReason: 'Chargeback investigation', adminRemarks: 'Raised by finance' });
    expect(after.statusHistory[0]).toMatchObject({ action: 'Customer suspended', previousStatus: 'Active', newStatus: 'Blocked', reason: 'Chargeback investigation', performedBy: 'Customer Operations', performedById: 'EMP-CO-9' });
    for (const field of ['id', 'role', 'fullName', 'email', 'phone', 'location', 'registrationDate']) expect(after[field]).toBe(before[field]);
    expect(after.password ?? after.passwordHash).toBeDefined();

    const activated = setStatus(coToken, 'CUS900', { status: 'Active', reason: 'Investigation closed' });
    expect(activated).toMatchObject({ changed: true, customer: { id: 'CUS900', status: 'Active' } });
    expect(record('CUS900')).toMatchObject({ accountStatus: 'Active', status: 'Active', blockReason: '' });
    expect(record('CUS900').statusHistory.map((entry: Record<string, string>) => entry.action)).toEqual(['Customer activated', 'Customer suspended']);
  });

  it('treats a customer without a recorded status as Active and makes repeated requests no-ops', () => {
    const { setStatus, record, employee } = server();
    const coToken = employee('EMP-CO-9', 'Customer Operations');
    expect(setStatus(coToken, 'CUS902', { status: 'Active' })).toEqual(expect.objectContaining({ changed: false }));
    expect(record('CUS902').statusHistory).toBeUndefined();

    expect(setStatus(coToken, 'CUS902', { status: 'Blocked' }).changed).toBe(true);
    expect(setStatus(coToken, 'CUS902', { status: 'Blocked' })).toMatchObject({ changed: false, customer: { status: 'Blocked' } });
    expect(record('CUS902').statusHistory).toHaveLength(1);
  });

  it('lets a superuser suspend and reactivate, recorded as the superuser', () => {
    const { setStatus, record, login } = server();
    const suToken = login('superuser', 'super@example.test');
    expect(setStatus(suToken, 'CUS901', { status: 'Blocked' }).customer.status).toBe('Blocked');
    expect(record('CUS901').statusHistory[0]).toMatchObject({ performedBy: 'Superuser', performedById: 'SU900' });
    expect(setStatus(suToken, 'CUS901', { status: 'Active' }).customer.status).toBe('Active');
  });

  it('denies Support, Provider Operations, customers and providers, even with spoofed headers', () => {
    const { setStatus, record, employee, login } = server();
    const tokens = [
      employee('EMP-SUP-9', 'Support'),
      employee('EMP-PO-9', 'Provider Operations'),
      login('customer', 'ravi@example.test'),
      login('provider', 'pro@example.test'),
    ];
    for (const token of tokens) {
      expect(denied(() => setStatus(token, 'CUS900', { status: 'Blocked' }))).toBe(true);
      expect(denied(() => setStatus(token, 'CUS900', { status: 'Blocked' }, { role: 'admin', department: 'Customer Operations', 'user-id': 'SU900' }))).toBe(true);
    }
    expect(record('CUS900').accountStatus).toBe('Active');
  });

  it('rejects invalid ids, missing customers, non-customer accounts, the caller and unmanaged statuses', () => {
    const { setStatus, record, employee, login } = server();
    const coToken = employee('EMP-CO-9', 'Customer Operations');
    const suToken = login('superuser', 'super@example.test');
    expect(() => setStatus(coToken, '../CUS900', { status: 'Blocked' })).toThrow(BadRequestException);
    expect(() => setStatus(coToken, 'CUS999', { status: 'Blocked' })).toThrow(NotFoundException);
    expect(() => setStatus(coToken, 'PRO900', { status: 'Blocked' })).toThrow('Only customer accounts can be suspended or activated here.');
    expect(() => setStatus(coToken, 'SU900', { status: 'Blocked' })).toThrow(ForbiddenException);
    expect(() => setStatus(coToken, 'EMP-CO-9', { status: 'Blocked' })).toThrow('You cannot change the status of your own account.');
    expect(() => setStatus(suToken, 'SU900', { status: 'Blocked' })).toThrow('You cannot change the status of your own account.');
    expect(() => setStatus(coToken, 'CUS903', { status: 'Active' })).toThrow(ConflictException);
    expect(record('PRO900').accountStatus).toBe('Active');
    expect(record('SU900').accountStatus).toBeUndefined();
    expect(record('CUS903').accountStatus).toBe('Deleted');
  });

  it('validates the requested status and reason, and refuses extra fields', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const meta: ArgumentMetadata = { type: 'body', metatype: UpdateCustomerStatusDto };
    await expect(pipe.transform({ status: 'Blocked', reason: 'Fraud review', remarks: 'note' }, meta)).resolves.toBeInstanceOf(UpdateCustomerStatusDto);
    for (const body of [
      { status: 'Suspended', reason: 'x' },
      { status: 'active', reason: 'x' },
      { status: 'Blocked' },
      { status: 'Blocked', reason: '   ' },
      { status: 'Blocked', reason: 'x'.repeat(501) },
      { status: 'Blocked', reason: 'x', role: 'superuser' },
      { status: 'Blocked', reason: 'x', email: 'new@example.test' },
    ]) {
      await expect(pipe.transform(body, meta)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('persists the status through the state file so it survives a backend restart', () => {
    const first = server();
    first.setStatus(first.employee('EMP-CO-9', 'Customer Operations'), 'CUS900', { status: 'Blocked' });
    const onDisk = JSON.parse(readFileSync(stateFile, 'utf8')) as Array<{ key: string; value: { users: Record<string, any>[] } }>;
    expect(onDisk.find((entry) => entry.key === 'serveEaseData')!.value.users.find((user) => user.id === 'CUS900')).toMatchObject({ accountStatus: 'Blocked', role: 'customer', email: 'asha@example.test' });

    const restarted = server();
    expect(restarted.record('CUS900').accountStatus).toBe('Blocked');
    expect(() => restarted.login('customer', 'asha@example.test')).toThrow(ForbiddenException);
    restarted.setStatus(restarted.employee('EMP-CO-9', 'Customer Operations'), 'CUS900', { status: 'Active' });
    expect(server().login('customer', 'asha@example.test')).toEqual(expect.any(String));
  });

  it('refuses new logins for a suspended customer without revealing it to a wrong password', () => {
    const { setStatus, employee, login, auth } = server();
    setStatus(employee('EMP-CO-9', 'Customer Operations'), 'CUS900', { status: 'Blocked' });
    expect(() => login('customer', 'asha@example.test')).toThrow('Your ServeEase customer account is currently suspended.');
    expect(() => auth.login({ role: 'customer', email: 'asha@example.test', password: 'Wrong@123' })).toThrow(UnauthorizedException);
    expect(() => auth.login({ role: 'customer', email: 'asha@example.test', password: 'Wrong@123' })).not.toThrow(/suspended/);
  });

  it('stops an existing session of the suspended customer and leaves every other session working', () => {
    const { setStatus, guarded, employee, login, auth } = server();
    const coToken = employee('EMP-CO-9', 'Customer Operations');
    const supportToken = employee('EMP-SUP-9', 'Support');
    const suspendedToken = login('customer', 'asha@example.test');
    const secondDevice = login('customer', 'asha@example.test');
    const otherCustomer = login('customer', 'ravi@example.test');
    const provider = login('provider', 'pro@example.test');
    const superuser = login('superuser', 'super@example.test');
    expect(guarded(BookingsController, 'createForCustomer', suspendedToken).auth.userId).toBe('CUS900');

    setStatus(coToken, 'CUS900', { status: 'Blocked' });
    for (const token of [suspendedToken, secondDevice]) {
      expect(denied(() => guarded(BookingsController, 'createForCustomer', token))).toBe(true);
      expect(denied(() => guarded(TicketsController, 'myTickets', token))).toBe(true);
      expect(() => auth.sessionUser(token)).toThrow(/suspended|invalid or expired/);
    }

    expect(guarded(BookingsController, 'createForCustomer', otherCustomer).auth.userId).toBe('CUS901');
    expect(auth.sessionUser(otherCustomer).id).toBe('CUS901');
    expect(guarded(BookingsController, 'updateProviderStatus', provider).auth.userId).toBe('PRO900');
    expect(guarded(TicketsController, 'supportTickets', supportToken).auth.department).toBe('Support');
    expect(guarded(EmployeeOperationsController, 'customers', coToken).auth.department).toBe('Customer Operations');
    expect(guarded(EmployeeOperationsController, 'customers', superuser).auth.role).toBe('superuser');

    // Reactivation does not revive the old sessions; the customer signs in again.
    setStatus(coToken, 'CUS900', { status: 'Active' });
    expect(() => auth.sessionUser(suspendedToken)).toThrow(UnauthorizedException);
    const fresh = login('customer', 'asha@example.test');
    expect(guarded(BookingsController, 'createForCustomer', fresh).auth.userId).toBe('CUS900');
  });

  it('refuses a session whose customer was suspended outside this endpoint (status re-read per request)', () => {
    const { record, login, auth, guarded } = server();
    const token = login('customer', 'asha@example.test');
    record('CUS900').accountStatus = 'Blocked';
    expect(denied(() => guarded(BookingsController, 'createForCustomer', token))).toBe(true);
    expect(() => auth.sessionUser(token)).toThrow(UnauthorizedException);
  });
});
