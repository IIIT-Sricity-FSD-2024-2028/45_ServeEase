import { API_BASE_URL, apiRequest } from './apiClient'
import { backendRole } from './requestContext'

async function uploadTicketAttachment(file) {
  let session
  try {
    session = JSON.parse(sessionStorage.getItem('serveEaseSession') || 'null') || {}
  } catch {
    session = {}
  }

  const headers = new Headers({
    role: backendRole(session.role),
    'user-id': session.userId || '',
    'user-email': session.email || '',
  })
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`)

  const formData = new FormData()
  formData.append('file', file)
  let response
  try {
    response = await fetch(`${API_BASE_URL}/uploads/tickets`, { method: 'POST', headers, body: formData })
  } catch (error) {
    throw new Error(`Ticket attachment upload could not be completed: ${error.message}`, { cause: error })
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message
    throw new Error(message || 'Ticket attachment upload failed.')
  }
  return payload?.data ?? null
}

export const authApi = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (account) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(account) }),
  session: () => apiRequest('/auth/session'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
}

// These wrappers correspond only to endpoints declared by the NestJS controllers.
export const catalogApi = {
  getCatalog: () => apiRequest('/catalog'),
  getProvider: (id) => apiRequest(`/catalog/providers/${encodeURIComponent(id)}`),
  getProviderServices: (providerId) => apiRequest(`/catalog/providers/${encodeURIComponent(providerId)}/services`),
  createProviderService: (providerId, service) => apiRequest(`/catalog/providers/${encodeURIComponent(providerId)}/services`, {
    method: 'POST',
    body: JSON.stringify(service),
  }),
  updateProviderService: (providerId, serviceId, service) => apiRequest(
    `/catalog/providers/${encodeURIComponent(providerId)}/services/${encodeURIComponent(serviceId)}`,
    { method: 'PATCH', body: JSON.stringify(service) },
  ),
}

export const bookingsApi = {
  list: () => apiRequest('/bookings'),
  get: (id) => apiRequest(`/bookings/${encodeURIComponent(id)}`),
  createForCustomer: (booking) => apiRequest('/bookings/customer', {
    method: 'POST',
    body: JSON.stringify(booking),
  }),
  listForProvider: () => apiRequest('/bookings/provider'),
  updateProviderStatus: (id, status, stateVersion) => apiRequest(`/bookings/${encodeURIComponent(id)}/provider-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(stateVersion === undefined ? {} : { stateVersion }) }),
  }),
}

export const availabilityApi = {
  get: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}`),
  getWeeklySchedule: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`),
  getDateOverrides: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides`),
}

export const ticketsApi = {
  listMine: () => apiRequest('/tickets/my-tickets'),
  get: (id) => apiRequest(`/tickets/${encodeURIComponent(id)}`),
  uploadAttachment: uploadTicketAttachment,
  createCustomer: (ticket) => apiRequest('/tickets/customer', {
    method: 'POST',
    body: JSON.stringify(ticket),
  }),
  listProvider: () => apiRequest('/tickets/my-provider-tickets'),
  createProvider: (ticket) => apiRequest('/tickets/provider', {
    method: 'POST',
    body: JSON.stringify(ticket),
  }),
  listForSupport: () => apiRequest('/support/tickets'),
  getForSupport: (id) => apiRequest(`/support/tickets/${encodeURIComponent(id)}`),
  updateSupportStatus: (id, status) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateSupportRemarks: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/remarks`, { method: 'PATCH', body: JSON.stringify({ remarks }) }),
  resolveForSupport: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/resolve`, { method: 'PATCH', body: JSON.stringify({ remarks }) }),
  escalateForSupport: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/escalate`, { method: 'PATCH', body: JSON.stringify({ remarks }) }),
}

export const supportApi = {
  list: () => apiRequest('/support/tickets'),
  get: (id) => apiRequest(`/support/tickets/${encodeURIComponent(id)}`),
  updateStatus: (id, status) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  updateRemarks: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/remarks`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  }),
  resolve: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  }),
  escalate: (id, remarks) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/escalate`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  }),
  updatePriority: (id, priority) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  }),
}
