export function backendRole(role) {
  if (role === 'admin' || role === 'superuser') return 'admin'
  if (role === 'provider' || role === 'support') return role
  return 'user'
}

/**
 * This preserves the assignment's role-header API contract. The browser values
 * are caller supplied and do not prove identity or secure booking ownership.
 */
export function requestContext(session = {}) {
  const headers = { role: backendRole(session.role) }
  if (session.userId) headers['user-id'] = String(session.userId)
  if (session.email) headers['user-email'] = String(session.email)
  return headers
}
