import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function serviceWith(employees: Record<string, unknown>[], users: Record<string, unknown>[] = []) {
  const state = {
    findById: (key: string) => key === 'serveEaseEmployeeModuleData'
      ? { value: { employees } }
      : key === 'serveEaseData' ? { value: { users } } : undefined,
    update: jest.fn(),
    create: jest.fn(),
  };
  return new AuthService(state as never);
}

describe('AuthService employee sessions', () => {
  it('restores an employee support session from the employee state record', () => {
    const service = serviceWith([{
      employeeId: 'EMP-SUP-002',
      name: 'Support Agent',
      email: 'support@example.com',
      department: 'Support',
      password: 'Support@123',
    }]);

    const { token, user } = service.login({
      role: 'employee',
      employeeId: 'EMP-SUP-002',
      department: 'Support',
      password: 'Support@123',
    });

    expect(user).toMatchObject({ id: 'EMP-SUP-002', role: 'support', email: 'support@example.com' });
    expect(service.sessionUser(token)).toMatchObject({ id: 'EMP-SUP-002', role: 'support' });
    expect(service.principal(token)).toMatchObject({ userId: 'EMP-SUP-002', role: 'support' });
  });

  it.each(['Customer Operations', 'Provider Operations', 'Support'])('keeps the %s department through login, session restore and principal', (department) => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department, password: 'Pass@123' }]);
    const { token, user } = service.login({ role: 'employee', employeeId: 'emp-1', department, password: 'Pass@123' });

    expect(user).toMatchObject({ id: 'EMP-1', role: 'support', department });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('passwordHash');
    expect(service.sessionUser(token)).toMatchObject({ role: 'support', department });
    expect(service.principal(token)).toMatchObject({ userId: 'EMP-1', role: 'support', department });
  });

  it('rejects a login whose department does not match the stored record', () => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department: 'Customer Operations', password: 'Pass@123' }]);
    expect(() => service.login({ role: 'employee', employeeId: 'EMP-1', department: 'Support', password: 'Pass@123' })).toThrow(UnauthorizedException);
  });

  it('refuses unsupported departments at login and drops them on restore', () => {
    const employees = [{ employeeId: 'EMP-1', name: 'Employee One', department: 'Finance', password: 'Pass@123' }];
    const service = serviceWith(employees);
    expect(() => service.login({ role: 'employee', employeeId: 'EMP-1', department: 'Finance', password: 'Pass@123' })).toThrow('This employee department is not supported.');

    employees[0].department = 'Support';
    const { token } = service.login({ role: 'employee', employeeId: 'EMP-1', department: 'Support', password: 'Pass@123' });
    employees[0].department = 'Finance';
    expect(service.principal(token).department).toBeNull();
    expect(service.sessionUser(token)).toMatchObject({ department: null });
  });

  it('invalidates the session on logout', () => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department: 'Support', password: 'Pass@123' }]);
    const { token } = service.login({ role: 'employee', employeeId: 'EMP-1', department: 'Support', password: 'Pass@123' });
    service.logout(token);
    expect(() => service.sessionUser(token)).toThrow(UnauthorizedException);
  });

  it('leaves customer, provider and superuser sessions without a department', () => {
    const service = serviceWith([], [
      { id: 'CUS1', role: 'customer', email: 'c@example.test', password: 'Pass@123' },
      { id: 'PRO1', role: 'provider', email: 'p@example.test', password: 'Pass@123', providerCatalogId: 'listing-1' },
      { id: 'SU1', role: 'superuser', email: 's@example.test', password: 'Pass@123' },
    ]);
    const customer = service.login({ role: 'customer', email: 'c@example.test', password: 'Pass@123' });
    const provider = service.login({ role: 'provider', email: 'p@example.test', password: 'Pass@123' });
    const superuser = service.login({ role: 'superuser', email: 's@example.test', password: 'Pass@123' });
    expect(service.principal(customer.token)).toEqual({ userId: 'CUS1', role: 'customer', email: 'c@example.test', providerCatalogId: undefined, department: undefined });
    expect(service.principal(provider.token)).toMatchObject({ role: 'provider', providerCatalogId: 'listing-1', department: undefined });
    expect(service.principal(superuser.token)).toMatchObject({ role: 'superuser', department: undefined });
    expect(() => service.login({ role: 'customer', email: 'p@example.test', password: 'Pass@123' })).toThrow(UnauthorizedException);
  });
});
