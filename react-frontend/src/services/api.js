import { apiRequest } from './apiClient'

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
}

export const availabilityApi = {
  get: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}`),
  getWeeklySchedule: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`),
  getDateOverrides: (providerId) => apiRequest(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides`),
}

export const ticketsApi = {
  listMine: () => apiRequest('/tickets/my-tickets'),
  get: (id) => apiRequest(`/tickets/${encodeURIComponent(id)}`),
}

