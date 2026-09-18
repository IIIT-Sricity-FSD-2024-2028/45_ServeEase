import { apiRequest } from './apiClient'

// These wrappers correspond only to endpoints declared by the NestJS controllers.
export const catalogApi = {
  getCatalog: () => apiRequest('/catalog'),
  getProvider: (id) => apiRequest(`/catalog/providers/${encodeURIComponent(id)}`),
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
