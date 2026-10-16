// Employee departments accepted at sign-in (front-end/JavaScript/auth.js getEmployeeLoginDestination).
// The department always comes from the server-side employee record, never from a request.
export const EMPLOYEE_DEPARTMENTS = ['Customer Operations', 'Provider Operations', 'Support'] as const;
export type EmployeeDepartment = (typeof EMPLOYEE_DEPARTMENTS)[number];

/** Returns the department when it is one of the supported values, otherwise null (no workspace access). */
export function employeeDepartment(value: unknown): EmployeeDepartment | null {
  return (EMPLOYEE_DEPARTMENTS as readonly string[]).includes(String(value)) ? (value as EmployeeDepartment) : null;
}
