import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../modules/auth/auth.service';
import { BookingsController } from '../modules/bookings/bookings.controller';
import { EmployeeOperationsController } from '../modules/employee-operations/employee-operations.controller';
import { ProviderVerificationController } from '../modules/provider-verification/provider-verification.controller';
import { TicketsController } from '../modules/tickets/tickets.controller';
import { RolesGuard } from './roles.guard';

// Fixture accounts only; the guard and auth service run unmodified against the real route metadata.
function harness() {
  const employees = [
    { employeeId: 'EMP-CO-9', name: 'Customer Ops', department: 'Customer Operations', password: 'Pass@123' },
    { employeeId: 'EMP-PO-9', name: 'Provider Ops', department: 'Provider Operations', password: 'Pass@123' },
    { employeeId: 'EMP-SUP-9', name: 'Support Agent', department: 'Support', password: 'Pass@123' },
  ];
  const users = [
    { id: 'CUS900', role: 'customer', email: 'customer@example.test', password: 'Pass@123' },
    { id: 'SU900', role: 'superuser', email: 'super@example.test', password: 'Pass@123' },
  ];
  const state = {
    findById: (key: string) => (key === 'serveEaseEmployeeModuleData' ? { value: { employees } } : key === 'serveEaseData' ? { value: { users } } : undefined),
    update: jest.fn(),
    create: jest.fn(),
  };
  const auth = new AuthService(state as never);
  const guard = new RolesGuard(new Reflector(), auth);
  const employee = (employeeId: string) => auth.login({ identifier: employeeId, password: 'Pass@123' }).token;
  const tokens = {
    customerOps: employee('EMP-CO-9'),
    providerOps: employee('EMP-PO-9'),
    support: employee('EMP-SUP-9'),
    customer: auth.login({ identifier: 'customer@example.test', password: 'Pass@123' }).token,
    superuser: auth.login({ identifier: 'super@example.test', password: 'Pass@123' }).token,
  };
  const call = (controller: { prototype: object }, method: string, token?: string, headers: Record<string, string> = {}) => {
    const request = { headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } } as Record<string, any>;
    const context = {
      getHandler: () => (controller.prototype as Record<string, unknown>)[method],
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { allowed: () => guard.canActivate(context), request };
  };
  const allowed = (controller: { prototype: object }, method: string, token?: string, headers?: Record<string, string>) => {
    try { return call(controller, method, token, headers).allowed(); } catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  };
  return { employees, tokens, allowed, call };
}

describe('RolesGuard department authorization', () => {
  it('lets each department reach only its own workspace endpoints', () => {
    const { tokens, allowed } = harness();
    expect(allowed(EmployeeOperationsController, 'customers', tokens.customerOps)).toBe(true);
    expect(allowed(EmployeeOperationsController, 'customer', tokens.customerOps)).toBe(true);
    expect(allowed(EmployeeOperationsController, 'providers', tokens.customerOps)).toBe(false);

    expect(allowed(EmployeeOperationsController, 'providers', tokens.providerOps)).toBe(true);
    expect(allowed(EmployeeOperationsController, 'customers', tokens.providerOps)).toBe(false);

    expect(allowed(EmployeeOperationsController, 'customers', tokens.support)).toBe(false);
    expect(allowed(EmployeeOperationsController, 'providers', tokens.support)).toBe(false);
  });

  it('keeps support ticket operations for the Support department only', () => {
    const { tokens, allowed } = harness();
    for (const method of ['supportTickets', 'supportTicket', 'supportStatus', 'supportRemarks', 'supportResolve', 'supportEscalate', 'supportPriority', 'getTicket']) {
      expect(allowed(TicketsController, method, tokens.support)).toBe(true);
      expect(allowed(TicketsController, method, tokens.customerOps)).toBe(false);
      expect(allowed(TicketsController, method, tokens.providerOps)).toBe(false);
    }
  });

  it('keeps superuser-only and customer-only endpoints closed to employees', () => {
    const { tokens, allowed } = harness();
    for (const token of [tokens.customerOps, tokens.providerOps, tokens.support]) {
      expect(allowed(ProviderVerificationController, 'approveProvider', token)).toBe(false);
      expect(allowed(ProviderVerificationController, 'rejectProvider', token)).toBe(false);
      expect(allowed(TicketsController, 'adminEscalatedTickets', token)).toBe(false);
      expect(allowed(TicketsController, 'finalDecision', token)).toBe(false);
      expect(allowed(BookingsController, 'findAll', token)).toBe(false);
      expect(allowed(BookingsController, 'updateWithPatch', token)).toBe(false);
    }
  });

  it('preserves superuser and customer access', () => {
    const { tokens, allowed } = harness();
    expect(allowed(EmployeeOperationsController, 'customers', tokens.superuser)).toBe(true);
    expect(allowed(EmployeeOperationsController, 'providers', tokens.superuser)).toBe(true);
    expect(allowed(TicketsController, 'supportTickets', tokens.superuser)).toBe(true);
    expect(allowed(ProviderVerificationController, 'approveProvider', tokens.superuser)).toBe(true);
    expect(allowed(BookingsController, 'findAll', tokens.customer)).toBe(true);
    expect(allowed(TicketsController, 'myTickets', tokens.customer)).toBe(true);
    expect(allowed(EmployeeOperationsController, 'customers', tokens.customer)).toBe(false);
    expect(allowed(TicketsController, 'supportTickets', tokens.customer)).toBe(false);
  });

  it('rejects unauthenticated requests and ignores caller-supplied role or department headers', () => {
    const { tokens, allowed, call } = harness();
    expect(allowed(EmployeeOperationsController, 'customers')).toBe(false);
    expect(allowed(TicketsController, 'supportTickets', undefined, { role: 'support', department: 'Support' })).toBe(false);
    expect(allowed(TicketsController, 'supportTickets', tokens.customerOps, { role: 'support', department: 'Support' })).toBe(false);
    expect(allowed(EmployeeOperationsController, 'providers', tokens.customerOps, { department: 'Provider Operations' })).toBe(false);

    const { allowed: run, request } = call(EmployeeOperationsController, 'customers', tokens.customerOps, { 'user-id': 'SOMEONE-ELSE' });
    expect(run()).toBe(true);
    expect(request.headers['user-id']).toBe('EMP-CO-9');
    expect(request.auth).toMatchObject({ role: 'support', department: 'Customer Operations' });
  });

  it('denies every workspace once the stored department is no longer supported', () => {
    const { employees, tokens, allowed } = harness();
    employees[2].department = 'Finance';
    expect(allowed(TicketsController, 'supportTickets', tokens.support)).toBe(false);
    expect(allowed(EmployeeOperationsController, 'customers', tokens.support)).toBe(false);
    expect(allowed(EmployeeOperationsController, 'providers', tokens.support)).toBe(false);
  });
});
