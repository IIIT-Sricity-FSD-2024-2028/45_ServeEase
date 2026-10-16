import { SetMetadata } from '@nestjs/common';
import { EmployeeDepartment } from '../common/employee-departments';

export const ROLES_KEY = 'roles';
export type AppRole = 'admin' | 'superuser' | 'support' | 'provider' | 'user';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

// Employee sessions carry the 'support' role plus a department. Routes open to employees state which
// departments may use them; when a route allows 'support' without naming departments, only the
// Support department is accepted (see RolesGuard).
export const DEPARTMENTS_KEY = 'departments';
export const Departments = (...departments: EmployeeDepartment[]) => SetMetadata(DEPARTMENTS_KEY, departments);
