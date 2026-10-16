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

describe('AuthService provider profile updates', () => {
  function providerService() {
    const value = {
      users: [
        { id: 'PRO001', role: 'provider', email: 'p@example.com', phone: '9000000001', fullName: 'Pro One', organisationName: 'Old Org', cityId: 1, cityName: 'Chennai', password: 'Pass@1234' },
        { id: 'PRO002', role: 'provider', email: 'q@example.com', phone: '9000000002', fullName: 'Pro Two', password: 'Pass@1234' },
        { id: 'CUS001', role: 'customer', email: 'c@example.com', phone: '9000000003', fullName: 'Cus One', password: 'Pass@1234' },
      ],
      providers: [{ id: 'old-org', name: 'Old Org', ownerProviderId: 'PRO001', cityId: 1, location: 'Chennai' }, { id: 'other', name: 'Other', ownerProviderId: 'PRO002', cityId: 1, location: 'Chennai' }],
    };
    const state = { findById: (key: string) => (key === 'serveEaseData' ? { value } : undefined), update: jest.fn(), create: jest.fn() };
    return { service: new AuthService(state as never), value, state };
  }

  it('updates only the signed-in provider and keeps their listing name in step', () => {
    const { service, value, state } = providerService();
    const { token } = service.login({ role: 'provider', email: 'p@example.com', password: 'Pass@1234' });
    const updated = service.updateProviderProfile(token, { organisationName: 'New Org', phone: '9000000009', cityId: 2, ifsc: 'hdfc0001234', accountNumber: '123456789012' });
    expect(updated).toMatchObject({ id: 'PRO001', organisationName: 'New Org', phone: '9000000009', cityName: 'Bangalore', ifsc: 'HDFC0001234', accountNumber: '123456789012' });
    expect(updated).not.toHaveProperty('passwordHash');
    expect(value.providers[0]).toMatchObject({ name: 'New Org', cityId: 1, location: 'Chennai' });
    expect(value.providers[1]).toMatchObject({ name: 'Other', cityId: 1 });
    expect(value.users[1]).toMatchObject({ phone: '9000000002' });
    expect(state.update).toHaveBeenCalled();
  });

  it('shows the original sample bank details until the provider saves their own', () => {
    const { service } = providerService();
    const { token, user } = service.login({ role: 'provider', email: 'p@example.com', password: 'Pass@1234' });
    expect(user).toMatchObject({ bankName: 'HDFC Bank', accountHolder: 'Old Org', accountNumber: 'XXXXXX1129', ifsc: 'HDFC0001234' });
    expect(service.updateProviderProfile(token, { bankName: 'SBI', accountHolder: 'Pro One', accountNumber: '123456789', ifsc: 'sbin0001234' })).toMatchObject({ bankName: 'SBI', accountHolder: 'Pro One', accountNumber: '123456789', ifsc: 'SBIN0001234' });
    expect(service.sessionUser(token)).toMatchObject({ bankName: 'SBI', accountNumber: '123456789' });
  });

  it('rejects a phone number that belongs to another account and non-provider sessions', () => {
    const { service } = providerService();
    const provider = service.login({ role: 'provider', email: 'p@example.com', password: 'Pass@1234' });
    expect(() => service.updateProviderProfile(provider.token, { phone: '9000000002' })).toThrow('Phone number already exists.');
    const customer = service.login({ role: 'customer', email: 'c@example.com', password: 'Pass@1234' });
    expect(() => service.updateProviderProfile(customer.token, { fullName: 'Hacker' })).toThrow('Only providers');
  });
});
