import { AuthService } from './auth.service';

describe('AuthService employee sessions', () => {
  it('restores an employee support session from the employee state record', () => {
    const employeeState = {
      employees: [{
        employeeId: 'EMP-SUP-002',
        name: 'Support Agent',
        email: 'support@example.com',
        department: 'Support',
        password: 'Support@123',
      }],
    };
    const state = {
      findById: (key: string) => key === 'serveEaseEmployeeModuleData'
        ? { value: employeeState }
        : key === 'serveEaseData' ? { value: { users: [] } } : undefined,
      update: jest.fn(),
    };
    const service = new AuthService(state as never);

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
});
