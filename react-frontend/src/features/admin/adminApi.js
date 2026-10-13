import { apiRequest } from '../../services/apiClient'

export function listBookings() {
  return apiRequest('/bookings')
}

export function listCatalog() {
  return apiRequest('/catalog')
}

export function listVerificationRequests() {
  return apiRequest('/admin/providers/verification')
}

export function getVerificationRequest(id) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}`)
}

export function approveProvider(id, adminRemarks) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
    ...(adminRemarks === undefined ? {} : { body: JSON.stringify({ adminRemarks }) }),
  })
}

export function rejectProvider(id, { rejectionReason, adminRemarks } = {}) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason, ...(adminRemarks === undefined ? {} : { adminRemarks }) }),
  })
}

export function listEscalatedTickets() {
  return apiRequest('/admin/escalated-tickets')
}
