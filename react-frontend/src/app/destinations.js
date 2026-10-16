// Where a signed-in account belongs. Employees all hold the 'support' role; their workspace follows the
// department on their server-side record (front-end/JavaScript/auth.js getEmployeeLoginDestination).
export const employeeWorkspaces = {
  'Customer Operations': '/employee/customer-operations',
  'Provider Operations': '/employee/provider-operations',
  Support: '/employee/support-tickets',
}

export const UNSUPPORTED_DEPARTMENT_PATH = '/employee/unsupported-department'

export function destinationFor(user) {
  switch (user?.role) {
    case 'customer': return '/customer/dashboard'
    case 'provider': return '/provider/dashboard'
    case 'superuser': return '/admin'
    // An unknown or missing department never falls back to Support.
    case 'support': return employeeWorkspaces[user.department] || UNSUPPORTED_DEPARTMENT_PATH
    default: return '/'
  }
}

// Route guard rule shared by ProtectedRoute: null when the user may stay, otherwise where to send them.
// `department` only binds employee ('support') sessions; other allowed roles such as superuser pass.
export function accessRedirect(user, { role, department } = {}) {
  const roles = role ? [].concat(role) : null
  if (roles && !roles.includes(user?.role)) return destinationFor(user)
  const departments = department ? [].concat(department) : null
  if (departments && user?.role === 'support' && !departments.includes(user.department)) return destinationFor(user)
  return null
}
