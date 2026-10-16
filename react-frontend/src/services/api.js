import { apiRequest, blobRequest, uploadRequest } from './apiClient'

export const authApi = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (account) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(account) }),
  session: () => apiRequest('/auth/session'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  updateProviderProfile: (profile) => apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
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
  // PUT /availability/providers/:id/weekly-schedule replaces the recurring schedule (UpsertWeeklyScheduleDto).
  saveWeeklySchedule: (providerId, weeklySchedule) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`, {
    method: 'PUT',
    body: JSON.stringify({ weeklySchedule }),
  }),
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
  // "Chat with Support": the owner of a ticket (customer or provider) adds a message to its conversation.
  sendMessage: (id, text) => apiRequest(`/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  // Support side: reply in the conversation and share a solution as the ticket's Support Update.
  sendSupportMessage: (id, text) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  saveSupportSolution: (id, solution) => apiRequest(`/support/tickets/${encodeURIComponent(id)}/solution`, { method: 'PATCH', body: JSON.stringify({ solution }) }),
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
  customerNotifications: () => apiRequest('/employee/customer-operations/notifications'),
  customer: (id) => apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}`),
  // PATCH body: { status: 'Blocked' | 'Active', reason, remarks? }; returns { customer, changed }.
  setCustomerStatus: (id, change) => apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(change),
  }),
  providers: () => apiRequest('/employee/provider-operations/providers'),
  providerNotifications: () => apiRequest('/employee/provider-operations/notifications'),
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

// Customer ratings of completed bookings (customer.js review modal + reviews.js), stored by the backend.
export const reviewsApi = {
  mine: () => apiRequest('/reviews/mine'),
  save: (bookingId, review) => apiRequest(`/reviews/bookings/${encodeURIComponent(bookingId)}`, { method: 'PUT', body: JSON.stringify(review) }),
  forProvider: () => apiRequest('/reviews/provider'),
  forListing: (listingId) => apiRequest(`/reviews/listings/${encodeURIComponent(listingId)}`),
}

// The signed-in provider's own profile photo: readable and replaceable at any time.
export const providerPhotoApi = {
  get: () => blobRequest('/provider/profile-photo'),
  replace: (file) => { const body = new FormData(); body.append('file', file); return apiRequest('/provider/profile-photo', { method: 'PUT', body }) },
}

// Provider-side upload of the file behind one of the provider's own verification documents.
export const providerDocumentsApi = {
  list: () => apiRequest('/provider/verification-documents'),
  file: (documentId) => blobRequest(`/provider/verification-documents/${encodeURIComponent(documentId)}/file`),
  upload: (documentId, file, options) => uploadRequest(`/provider/verification-documents/${encodeURIComponent(documentId)}/file`, file, options),
}
