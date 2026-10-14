import { apiRequest, uploadRequest } from './apiClient'

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
  saveDateOverride: (providerId, date, override) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(override),
  }),
  deleteDateOverride: (providerId, date) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides/${encodeURIComponent(date)}`, { method: 'DELETE' }),
}

export const ticketsApi = {
  listMine: () => apiRequest('/tickets/my-tickets'),
  get: (id) => apiRequest(`/tickets/${encodeURIComponent(id)}`),
  createCustomer: (ticket) => apiRequest('/tickets/customer', {
    method: 'POST',
    body: JSON.stringify(ticket),
  }),
  listProvider: () => apiRequest('/tickets/my-provider-tickets'),
  createProvider: (ticket) => apiRequest('/tickets/provider', {
    method: 'POST',
    body: JSON.stringify(ticket),
  }),
  uploadAttachment: (file) => uploadRequest('/uploads/tickets', file),
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
