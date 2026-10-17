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

    const { token, user } = service.login({ identifier: 'EMP-SUP-002', password: 'Support@123' });

    expect(user).toMatchObject({ id: 'EMP-SUP-002', role: 'support', email: 'support@example.com' });
    expect(service.sessionUser(token)).toMatchObject({ id: 'EMP-SUP-002', role: 'support' });
    expect(service.principal(token)).toMatchObject({ userId: 'EMP-SUP-002', role: 'support' });
  });

  it.each(['Customer Operations', 'Provider Operations', 'Support'])('keeps the %s department through login, session restore and principal', (department) => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department, password: 'Pass@123' }]);
    const { token, user } = service.login({ identifier: 'emp-1', password: 'Pass@123' });

    expect(user).toMatchObject({ id: 'EMP-1', role: 'support', department });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('passwordHash');
    expect(service.sessionUser(token)).toMatchObject({ role: 'support', department });
    expect(service.principal(token)).toMatchObject({ userId: 'EMP-1', role: 'support', department });
  });

  // The client used to send the department and have it matched against the record. It no longer can, so the
  // department the session carries is whatever the record says and cannot be steered from the request.
  it('takes the department from the stored record, not from the request', () => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department: 'Customer Operations', password: 'Pass@123' }]);
    const { token } = service.login({ identifier: 'EMP-1', password: 'Pass@123' });
    expect(service.principal(token).department).toBe('Customer Operations');
  });

  it('refuses unsupported departments at login and drops them on restore', () => {
    const employees = [{ employeeId: 'EMP-1', name: 'Employee One', department: 'Finance', password: 'Pass@123' }];
    const service = serviceWith(employees);
    expect(() => service.login({ identifier: 'EMP-1', password: 'Pass@123' })).toThrow('This employee department is not supported.');

    employees[0].department = 'Support';
    const { token } = service.login({ identifier: 'EMP-1', password: 'Pass@123' });
    employees[0].department = 'Finance';
    expect(service.principal(token).department).toBeNull();
    expect(service.sessionUser(token)).toMatchObject({ department: null });
  });

  it('invalidates the session on logout', () => {
    const service = serviceWith([{ employeeId: 'EMP-1', name: 'Employee One', department: 'Support', password: 'Pass@123' }]);
    const { token } = service.login({ identifier: 'EMP-1', password: 'Pass@123' });
    service.logout(token);
    expect(() => service.sessionUser(token)).toThrow(UnauthorizedException);
  });

  it('leaves customer, provider and superuser sessions without a department', () => {
    const service = serviceWith([], [
      { id: 'CUS1', role: 'customer', email: 'c@example.test', password: 'Pass@123' },
      { id: 'PRO1', role: 'provider', email: 'p@example.test', password: 'Pass@123', providerCatalogId: 'listing-1' },
      { id: 'SU1', role: 'superuser', email: 's@example.test', password: 'Pass@123' },
    ]);
    const customer = service.login({ identifier: 'c@example.test', password: 'Pass@123' });
    const provider = service.login({ identifier: 'PRO1', password: 'Pass@123' });
    const superuser = service.login({ identifier: 's@example.test', password: 'Pass@123' });
    expect(service.principal(customer.token)).toEqual({ userId: 'CUS1', role: 'customer', email: 'c@example.test', providerCatalogId: undefined, department: undefined });
    expect(service.principal(provider.token)).toMatchObject({ role: 'provider', providerCatalogId: 'listing-1', department: undefined });
    expect(service.principal(superuser.token)).toMatchObject({ role: 'superuser', department: undefined });
  });
});

describe('AuthService identifier resolution', () => {
  const accounts = (): Record<string, any>[] => [
    { id: 'CUS1', role: 'customer', email: 'shared@example.test', password: 'Cus@1234' },
    { id: 'PRO9', role: 'provider', email: 'shared@example.test', password: 'Pro@1234' },
    { id: 'SUR001', role: 'superuser', email: 'super@example.test', password: 'Sup@1234' },
    { id: 'SUP001', role: 'support', email: 'stub@example.test', password: 'Stub@123' },
  ];

  // The whole point of splitting the namespaces: the provider is addressed by PRO9 and the customer by the
  // email, so one person may hold both accounts on one email and each identifier still resolves exactly one.
  it('resolves a customer and a provider that share one email by their own identifiers', () => {
    const service = serviceWith([], accounts());
    expect(service.login({ identifier: 'shared@example.test', password: 'Cus@1234' }).user).toMatchObject({ id: 'CUS1', role: 'customer' });
    expect(service.login({ identifier: 'PRO9', password: 'Pro@1234' }).user).toMatchObject({ id: 'PRO9', role: 'provider' });
  });

  it('does not reach a provider by email, even with the right password', () => {
    const service = serviceWith([], accounts());
    expect(() => service.login({ identifier: 'shared@example.test', password: 'Pro@1234' })).toThrow(UnauthorizedException);
  });

  it('resolves the superuser by email or by id', () => {
    const service = serviceWith([], accounts());
    expect(service.login({ identifier: 'super@example.test', password: 'Sup@1234' }).user).toMatchObject({ id: 'SUR001', role: 'superuser' });
    expect(service.login({ identifier: 'sur001', password: 'Sup@1234' }).user).toMatchObject({ id: 'SUR001', role: 'superuser' });
  });

  // SUP001 is a legacy stub in users with no department. A session on it would authenticate into no workspace.
  it('refuses the legacy support stub by either id or email', () => {
    const service = serviceWith([], accounts());
    expect(() => service.login({ identifier: 'SUP001', password: 'Stub@123' })).toThrow(UnauthorizedException);
    expect(() => service.login({ identifier: 'stub@example.test', password: 'Stub@123' })).toThrow(UnauthorizedException);
  });

  it('gives the same message to an unknown identifier, a wrong password and a blank identifier', () => {
    const service = serviceWith([], accounts());
    const message = 'Invalid credentials. Check your email or ServeEase ID and password.';
    expect(() => service.login({ identifier: 'nobody@example.test', password: 'Cus@1234' })).toThrow(message);
    expect(() => service.login({ identifier: 'NOSUCHID', password: 'Cus@1234' })).toThrow(message);
    expect(() => service.login({ identifier: 'shared@example.test', password: 'Wrong@123' })).toThrow(message);
    expect(() => service.login({ identifier: '   ', password: 'Cus@1234' })).toThrow(message);
  });

  it('upgrades a plaintext password to a hash on the id branch as well as the email branch', () => {
    const users = accounts();
    const service = serviceWith([], users);
    service.login({ identifier: 'PRO9', password: 'Pro@1234' });
    service.login({ identifier: 'shared@example.test', password: 'Cus@1234' });
    const provider = users.find((u) => u.id === 'PRO9')!;
    const customer = users.find((u) => u.id === 'CUS1')!;
    expect(provider).not.toHaveProperty('password');
    expect(customer).not.toHaveProperty('password');
    expect(provider.passwordHash).toEqual(expect.any(String));
    expect(customer.passwordHash).toEqual(expect.any(String));
    // The upgraded hash still verifies on the next login.
    expect(service.login({ identifier: 'PRO9', password: 'Pro@1234' }).user).toMatchObject({ id: 'PRO9' });
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
    const { token } = service.login({ identifier: 'PRO001', password: 'Pass@1234' });
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
    const { token, user } = service.login({ identifier: 'PRO001', password: 'Pass@1234' });
    expect(user).toMatchObject({ bankName: 'HDFC Bank', accountHolder: 'Old Org', accountNumber: 'XXXXXX1129', ifsc: 'HDFC0001234' });
    expect(service.updateProviderProfile(token, { bankName: 'SBI', accountHolder: 'Pro One', accountNumber: '123456789', ifsc: 'sbin0001234' })).toMatchObject({ bankName: 'SBI', accountHolder: 'Pro One', accountNumber: '123456789', ifsc: 'SBIN0001234' });
    expect(service.sessionUser(token)).toMatchObject({ bankName: 'SBI', accountNumber: '123456789' });
  });

  it('rejects a phone number that belongs to another account and limits customer edits to their phone', () => {
    const { service } = providerService();
    const provider = service.login({ identifier: 'PRO001', password: 'Pass@1234' });
    expect(() => service.updateProviderProfile(provider.token, { phone: '9000000002' })).toThrow('Phone number already exists.');
    const customer = service.login({ identifier: 'c@example.com', password: 'Pass@1234' });
    expect(service.updateProviderProfile(customer.token, { phone: '9000000004' })).toMatchObject({ id: 'CUS001', phone: '9000000004' });
    expect(() => service.updateProviderProfile(customer.token, { fullName: 'Hacker' })).toThrow('Customers can update only their phone number.');
  });
});

describe('AuthService customer registration', () => {
  it('records the new customer as Active with an unambiguous registration date', () => {
    const users: Record<string, unknown>[] = [];
    const service = serviceWith([], users);

    const { user } = service.register({
      role: 'customer', fullName: '  Asha Rao ', email: 'Asha@Example.test', phone: '9000000001', password: 'Pass@1234',
    } as never);

    const stored = users.find((item) => item.email === 'asha@example.test')!;
    expect(user).toMatchObject({ role: 'customer', fullName: 'Asha Rao' });
    // Customer Operations counts and shows this status; without it the account read as "N/A".
    expect(stored).toMatchObject({ accountStatus: 'Active', status: 'Active' });
    // ISO, so the date cannot be read as month-first wherever the server happens to run.
    expect(stored.registrationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(stored).not.toHaveProperty('location');
  });

  // A provider is free to book services, so the email and phone on their provider account must not block the
  // customer account they register for themselves. A second account of the same role still conflicts.
  it('allows a customer on an email and phone a provider already uses, but not a second customer', () => {
    const users: Record<string, unknown>[] = [
      { id: 'PRO001', role: 'provider', email: 'both@example.test', phone: '9000000001', password: 'Pass@1234' },
    ];
    const service = serviceWith([], users);
    const details = { role: 'customer', fullName: 'Asha Rao', email: 'both@example.test', phone: '9000000001', password: 'Pass@1234' };

    expect(service.register(details as never).user).toMatchObject({ role: 'customer', email: 'both@example.test' });
    expect(() => service.register(details as never)).toThrow('Email already exists.');
    expect(() => service.register({ ...details, email: 'other@example.test' } as never)).toThrow('Phone number already exists.');
  });

  it('refuses a second provider on an email a provider already uses', () => {
    const users: Record<string, unknown>[] = [
      { id: 'PRO001', role: 'provider', email: 'both@example.test', phone: '9000000001', password: 'Pass@1234' },
    ];
    const service = serviceWith([], users);
    expect(() => service.register({
      role: 'provider', fullName: 'Pro Two', email: 'both@example.test', phone: '9000000002', password: 'Pass@1234',
      organisationName: 'Org', serviceType: 'Plumbing', experience: 2, cityId: 1, address: '1 Example Road', idProofType: 'Aadhaar',
    } as never)).toThrow('Email already exists.');
  });
});
