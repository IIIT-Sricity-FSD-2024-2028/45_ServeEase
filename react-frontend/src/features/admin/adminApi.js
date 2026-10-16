import { apiRequest, blobRequest } from '../../services/apiClient'

export function listBookings() {
  return apiRequest('/bookings')
}

export function getBooking(id) {
  return apiRequest(`/bookings/${encodeURIComponent(id)}`)
}

export function listCatalog() {
  return apiRequest('/catalog')
}

export function syncCatalog(catalog) {
  return apiRequest('/catalog/sync', {
    method: 'POST',
    body: JSON.stringify(catalog),
  })
}

export async function saveCatalogCategories(categories) {
  let entry
  try {
    entry = await apiRequest('/state/serveEaseData')
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
  if (!entry?.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) return null
  return apiRequest('/state/serveEaseData', {
    method: 'PATCH',
    body: JSON.stringify({ value: { ...entry.value, categories } }),
  })
}

export function listCustomerAccounts() {
  return apiRequest('/employee/customer-operations/customers')
}

export function getCustomerAccount(id) {
  return apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}`)
}

export function updateCustomerAccountStatus(id, { status, reason, remarks } = {}) {
  return apiRequest(`/employee/customer-operations/customers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, remarks }),
  })
}

export function listProviderAccounts() {
  return apiRequest('/employee/provider-operations/providers')
}

export function getProviderAccount(id, listing) {
  const query = listing ? `?listing=${encodeURIComponent(listing)}` : ''
  return apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}${query}`)
}

export function getProviderDocumentPreview(id, documentId, listing) {
  const query = listing ? `?listing=${encodeURIComponent(listing)}` : ''
  return blobRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/preview${query}`)
}

export function updateProviderAccountStatus(id, { status, reason, remarks, listing } = {}) {
  const query = listing ? `?listing=${encodeURIComponent(listing)}` : ''
  return apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/status${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, remarks }),
  })
}

export function decideProviderAccountVerification(id, { decision, reason, remarks, listing } = {}) {
  const query = listing ? `?listing=${encodeURIComponent(listing)}` : ''
  return apiRequest(`/employee/provider-operations/providers/${encodeURIComponent(id)}/verification${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason, remarks }),
  })
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
    body: JSON.stringify(adminRemarks === undefined ? {} : { adminRemarks }),
  })
}

export function rejectProvider(id, { rejectionReason, adminRemarks } = {}) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason, ...(adminRemarks === undefined ? {} : { adminRemarks }) }),
  })
}

export function suspendProvider(id, adminRemarks) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify(adminRemarks === undefined ? {} : { adminRemarks }),
  })
}

export function approveProviderDocument(id, documentId) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/approve`, {
    method: 'PATCH',
  })
}

export function rejectProviderDocument(id, documentId, rejectionReason) {
  return apiRequest(`/admin/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason }),
  })
}

export function listEscalatedTickets() {
  return apiRequest('/admin/escalated-tickets')
}

export function listAdminTickets() {
  return apiRequest('/support/tickets')
}

export function updateAdminTicketStatus(id, status) {
  return apiRequest(`/support/tickets/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function escalateAdminTicket(id, remarks) {
  return apiRequest(`/support/tickets/${encodeURIComponent(id)}/escalate`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  })
}

export function resolveAdminTicket(id, solution) {
  return apiRequest(`/support/tickets/${encodeURIComponent(id)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks: solution }),
  })
}

export async function getSuperuserModuleData() {
  try {
    const entry = await apiRequest('/state/serveEaseSuperuserModuleData')
    return { exists: true, value: entry?.value && typeof entry.value === 'object' ? entry.value : {} }
  } catch (error) {
    if (error?.status === 404) return { exists: false, value: {} }
    throw error
  }
}

export function saveSuperuserModuleData(value, exists) {
  if (exists) {
    return apiRequest('/state/serveEaseSuperuserModuleData', {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  }
  return apiRequest('/state', {
    method: 'POST',
    body: JSON.stringify({ key: 'serveEaseSuperuserModuleData', value }),
  })
}

export async function getEmployeeModuleData() {
  try {
    const entry = await apiRequest('/state/serveEaseEmployeeModuleData')
    return { exists: true, value: entry?.value && typeof entry.value === 'object' ? entry.value : {} }
  } catch (error) {
    if (error?.status === 404) return { exists: false, value: {} }
    throw error
  }
}

export function saveEmployeeModuleData(value, exists) {
  if (exists) {
    return apiRequest('/state/serveEaseEmployeeModuleData', {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  }
  return apiRequest('/state', {
    method: 'POST',
    body: JSON.stringify({ key: 'serveEaseEmployeeModuleData', value }),
  })
}

export function getAdminTicket(id) {
  return apiRequest(`/admin/tickets/${encodeURIComponent(id)}`)
}

export function saveAdminTicketRemarks(id, remarks) {
  return apiRequest(`/admin/tickets/${encodeURIComponent(id)}/admin-remarks`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  })
}

export function submitAdminTicketDecision(id, finalDecision, adminRemarks) {
  return apiRequest(`/admin/tickets/${encodeURIComponent(id)}/final-decision`, {
    method: 'PATCH',
    body: JSON.stringify({ finalDecision, adminRemarks }),
  })
}
