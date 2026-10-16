import { apiRequest, blobRequest, uploadRequest } from './apiClient'

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
  // PATCH /bookings/:id — customers may only send { status: 'Cancelled' } for their own Pending/Accepted bookings.
  updateStatus: (id, status) => apiRequest(`/bookings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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

// Read-only employee workspaces; the backend limits each to its department (and superusers).
export const employeeOperationsApi = {
  customers: () => apiRequest('/employee/customer-operations/customers'),
  customer: (id) => apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}`),
  // PATCH body: { status: 'Blocked' | 'Active', reason, remarks? }; returns { customer, changed }.
  setCustomerStatus: (id, change) => apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(change),
  }),
  providers: () => apiRequest('/employee/provider-operations/providers'),
  // `listing` (catalog listing id) is only needed for the few legacy provider accounts that share an id.
  provider: (id, listing) => apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}${listing ? `?listing=${encodeURIComponent(listing)}` : ''}`),
  // PATCH body: { decision: 'approve' | 'reject', reason? (required to reject), remarks? }; returns the updated provider detail.
  // PATCH body: { status: 'Suspended' | 'Active', reason, remarks? }; returns the provider detail plus `changed`.
  setProviderStatus: (id, listing, change) => apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/status${listing ? `?listing=${encodeURIComponent(listing)}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(change),
  }),
  // The uploaded file behind one verification document, as a Blob (bearer-authenticated, never a public URL).
  providerDocument: (id, listing, documentId) => blobRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/preview${listing ? `?listing=${encodeURIComponent(listing)}` : ''}`),
  decideProviderVerification: (id, listing, decision) => apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/verification${listing ? `?listing=${encodeURIComponent(listing)}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(decision),
  }),
}

// Provider-side upload of the file behind one of the provider's own verification documents.
export const providerDocumentsApi = {
  upload: (documentId, file, options) => uploadRequest(`/provider/verification-documents/${encodeURIComponent(documentId)}/file`, file, options),
}
