import { createSlice } from '@reduxjs/toolkit'
import { nonEmptyKey } from '../entityReconciliation.js'

// The current SupportTicket API model identifies records with ticketId. The backend's legacy
// import path accepts old records with id, and ProviderSupportPage preserves that fallback.
// Redux therefore canonicalizes ticketId first and supports id only for those legacy records.
export function ticketEntityKey(ticket) {
  return nonEmptyKey(ticket?.ticketId) || nonEmptyKey(ticket?.id)
}

// Ticket records are stored once by their canonical ticket entity key; role-specific collections
// retain the server scopes used by ServeEase today (customer, provider, support, and admin).
export const initialTicketsState = {
  entities: {},
  scopeIds: {
    customer: [],
    provider: [],
    support: [],
    admin: [],
  },
  fetchStatus: {
    listByScope: { customer: 'idle', provider: 'idle', support: 'idle', admin: 'idle' },
    detailById: {},
  },
  fetchError: {
    listByScope: { customer: null, provider: null, support: null, admin: null },
    detailById: {},
  },
  mutationStatus: {
    createCustomerTicketByRequestKey: {},
    createProviderTicketByRequestKey: {},
    uploadAttachmentByRequestKey: {},
    ownerMessageById: {},
    supportMessageById: {},
    supportSolutionById: {},
    supportStatusById: {},
    supportRemarksById: {},
    supportResolveById: {},
    supportEscalateById: {},
    supportPriorityById: {},
    adminRemarksById: {},
    adminFinalDecisionById: {},
  },
  mutationError: {
    createCustomerTicketByRequestKey: {},
    createProviderTicketByRequestKey: {},
    uploadAttachmentByRequestKey: {},
    ownerMessageById: {},
    supportMessageById: {},
    supportSolutionById: {},
    supportStatusById: {},
    supportRemarksById: {},
    supportResolveById: {},
    supportEscalateById: {},
    supportPriorityById: {},
    adminRemarksById: {},
    adminFinalDecisionById: {},
  },
}

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: initialTicketsState,
  reducers: {},
})

export const selectTicketsState = (state) => state.tickets
export const selectTicketById = (ticketId) => (state) => state.tickets.entities[ticketId]
export const selectTicketIdsForScope = (scope) => (state) => state.tickets.scopeIds[scope] || []
export const selectTicketsForScope = (scope) => (state) => (state.tickets.scopeIds[scope] || [])
  .map((ticketId) => state.tickets.entities[ticketId])
  .filter(Boolean)
export const selectTicketListFetchStatus = (scope) => (state) => state.tickets.fetchStatus.listByScope[scope] || 'idle'
export const selectTicketListFetchError = (scope) => (state) => state.tickets.fetchError.listByScope[scope] || null
export const selectTicketDetailFetchStatus = (ticketId) => (state) => state.tickets.fetchStatus.detailById[ticketId] || 'idle'
export const selectTicketDetailFetchError = (ticketId) => (state) => state.tickets.fetchError.detailById[ticketId] || null
export const selectTicketMutationStatus = (operation, ticketId) => (state) => {
  const value = state.tickets.mutationStatus[operation]
  return ticketId === undefined ? value : value?.[ticketId] || 'idle'
}
export const selectTicketMutationError = (operation, ticketId) => (state) => {
  const value = state.tickets.mutationError[operation]
  return ticketId === undefined ? value : value?.[ticketId] || null
}

export default ticketsSlice.reducer
