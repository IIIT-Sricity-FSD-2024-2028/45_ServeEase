import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { ticketsApi } from '../../services/api.js'
import { nonEmptyKey, replaceFullRecord } from '../entityReconciliation.js'

export function ticketEntityKey(ticket) {
  return nonEmptyKey(ticket?.ticketId) || nonEmptyKey(ticket?.id)
}

const attachmentFilesByRequestKey = new Map()
const ownerOnlyFields = new Set(['supportRemarks', 'adminRemarks', 'escalationReason', 'assignedSupportId', 'assignedSupportName'])

export function registerTicketAttachmentFile(requestKey, file) {
  const key = nonEmptyKey(requestKey)
  if (!key || !file) throw new Error('A request key and attachment file are required.')
  attachmentFilesByRequestKey.set(key, file)
}

function errorText(error) {
  return error?.message ?? String(error ?? 'Request failed')
}

function reject(error, api) {
  return api.rejectWithValue(errorText(error))
}

function requireTicket(ticket) {
  if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket) || !ticketEntityKey(ticket)) {
    throw new Error('The ticket service returned an invalid ticket.')
  }
  return ticket
}

function requireTicketList(tickets) {
  if (!Array.isArray(tickets)) throw new Error('The ticket service returned an invalid response.')
  return tickets.map(requireTicket)
}

function ownerTicketProjection(ticket) {
  return Object.fromEntries(Object.entries(ticket).filter(([field]) => !ownerOnlyFields.has(field)))
}

function requireRequestKey(requestKey) {
  const key = nonEmptyKey(requestKey)
  if (!key) throw new Error('A request key is required.')
  return key
}

export const fetchCustomerTickets = createAsyncThunk('tickets/fetchCustomerTickets', async (_arg, api) => {
  try {
    return { scope: 'customer', tickets: requireTicketList(await ticketsApi.listMine()) }
  } catch (error) {
    return reject(error, api)
  }
})

export const fetchProviderTickets = createAsyncThunk('tickets/fetchProviderTickets', async (_arg, api) => {
  try {
    return { scope: 'provider', tickets: requireTicketList(await ticketsApi.listProvider()) }
  } catch (error) {
    return reject(error, api)
  }
})

export const fetchSupportTickets = createAsyncThunk('tickets/fetchSupportTickets', async (_arg, api) => {
  try {
    return { scope: 'support', tickets: requireTicketList(await ticketsApi.listForSupport()) }
  } catch (error) {
    return reject(error, api)
  }
})

export const fetchOwnerTicketById = createAsyncThunk('tickets/fetchOwnerTicketById', async ({ ticketId, scope }, api) => {
  try {
    if (!['customer', 'provider'].includes(scope)) throw new Error('A customer or provider ticket scope is required.')
    return { ticketId, scope, ticket: requireTicket(await ticketsApi.get(ticketId)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const fetchSupportTicketById = createAsyncThunk('tickets/fetchSupportTicketById', async (ticketId, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.getForSupport(ticketId)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const createCustomerTicket = createAsyncThunk('tickets/createCustomerTicket', async ({ ticket, requestKey }, api) => {
  try {
    const key = requireRequestKey(requestKey)
    return { requestKey: key, ticket: ownerTicketProjection(requireTicket(await ticketsApi.createCustomer(ticket))) }
  } catch (error) {
    return reject(error, api)
  }
})

export const createProviderTicket = createAsyncThunk('tickets/createProviderTicket', async ({ ticket, requestKey }, api) => {
  try {
    const key = requireRequestKey(requestKey)
    return { requestKey: key, ticket: ownerTicketProjection(requireTicket(await ticketsApi.createProvider(ticket))) }
  } catch (error) {
    return reject(error, api)
  }
})

export const uploadTicketAttachment = createAsyncThunk('tickets/uploadTicketAttachment', async (requestKey, api) => {
  const key = nonEmptyKey(requestKey)
  const file = key ? attachmentFilesByRequestKey.get(key) : null
  if (!key || !file) return api.rejectWithValue('The attachment upload request is missing its local file.')
  try {
    const metadata = await ticketsApi.uploadAttachment(file)
    if (!metadata || typeof metadata.fileUrl !== 'string' || !metadata.fileUrl) {
      throw new Error('The attachment upload did not return a saved file reference.')
    }
    return { requestKey: key, metadata }
  } catch (error) {
    return reject(error, api)
  } finally {
    attachmentFilesByRequestKey.delete(key)
  }
})

export const sendOwnerTicketMessage = createAsyncThunk('tickets/sendOwnerTicketMessage', async ({ ticketId, text, scope }, api) => {
  try {
    if (!['customer', 'provider'].includes(scope)) throw new Error('A customer or provider ticket scope is required.')
    return { ticketId, scope, ticket: requireTicket(await ticketsApi.sendMessage(ticketId, text)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const sendSupportTicketMessage = createAsyncThunk('tickets/sendSupportTicketMessage', async ({ ticketId, text }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.sendSupportMessage(ticketId, text)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const saveSupportTicketSolution = createAsyncThunk('tickets/saveSupportTicketSolution', async ({ ticketId, solution }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.saveSupportSolution(ticketId, solution)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const updateSupportTicketStatus = createAsyncThunk('tickets/updateSupportTicketStatus', async ({ ticketId, status }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.updateSupportStatus(ticketId, status)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const updateSupportTicketRemarks = createAsyncThunk('tickets/updateSupportTicketRemarks', async ({ ticketId, remarks }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.updateSupportRemarks(ticketId, remarks)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const resolveSupportTicket = createAsyncThunk('tickets/resolveSupportTicket', async ({ ticketId, remarks }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.resolveForSupport(ticketId, remarks)) }
  } catch (error) {
    return reject(error, api)
  }
})

export const escalateSupportTicket = createAsyncThunk('tickets/escalateSupportTicket', async ({ ticketId, remarks }, api) => {
  try {
    return { ticketId, ticket: requireTicket(await ticketsApi.escalateForSupport(ticketId, remarks)) }
  } catch (error) {
    return reject(error, api)
  }
})

const mutationOperations = [
  'createCustomerTicketByRequestKey',
  'createProviderTicketByRequestKey',
  'uploadAttachmentByRequestKey',
  'ownerMessageById',
  'supportMessageById',
  'supportSolutionById',
  'supportStatusById',
  'supportRemarksById',
  'supportResolveById',
  'supportEscalateById',
  'supportPriorityById',
  'adminRemarksById',
  'adminFinalDecisionById',
]

const emptyMutationMaps = () => Object.fromEntries(mutationOperations.map((operation) => [operation, {}]))

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
  mutationStatus: emptyMutationMaps(),
  mutationError: emptyMutationMaps(),
  latestRequestId: {
    listByScope: {},
    detailById: {},
    mutations: emptyMutationMaps(),
  },
  fetchRevisionAtRequest: {
    listByScope: {},
    detailById: {},
  },
  mutationRevision: 0,
  entityMutationRevisionById: {},
}

function requestTicketKey(ticketId) {
  return ticketEntityKey({ ticketId }) || nonEmptyKey(ticketId)
}

function storeTicket(state, ticket) {
  const key = ticketEntityKey(ticket)
  if (!key) return
  state.entities[key] = replaceFullRecord(ticket)
}

function storeTicketMutation(state, ticket) {
  const key = ticketEntityKey(ticket)
  if (!key) return
  state.mutationRevision += 1
  state.entityMutationRevisionById[key] = state.mutationRevision
  storeTicket(state, ticket)
}

function addScopeTicket(state, scope, key, prepend = false) {
  const ids = state.scopeIds[scope]
  if (!ids || ids.includes(key)) return
  if (prepend) ids.unshift(key)
  else ids.push(key)
}

function addMutationCases(builder, thunk, operation, keyOf, fulfill) {
  return builder
    .addCase(thunk.pending, (state, action) => {
      const key = keyOf(action.meta.arg)
      state.latestRequestId.mutations[operation][key] = action.meta.requestId
      state.mutationStatus[operation][key] = 'loading'
      state.mutationError[operation][key] = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const key = keyOf(action.meta.arg)
      if (state.latestRequestId.mutations[operation][key] !== action.meta.requestId) return
      fulfill?.(state, action)
      state.mutationStatus[operation][key] = 'succeeded'
      state.mutationError[operation][key] = null
    })
    .addCase(thunk.rejected, (state, action) => {
      const key = keyOf(action.meta.arg)
      if (state.latestRequestId.mutations[operation][key] !== action.meta.requestId) return
      state.mutationStatus[operation][key] = 'failed'
      state.mutationError[operation][key] = action.payload ?? action.error.message
    })
}

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: initialTicketsState,
  reducers: {},
  extraReducers: (builder) => {
    const listThunks = [fetchCustomerTickets, fetchProviderTickets, fetchSupportTickets]
    listThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state, action) => {
          const scope = thunk === fetchCustomerTickets ? 'customer' : thunk === fetchProviderTickets ? 'provider' : 'support'
          state.latestRequestId.listByScope[scope] = action.meta.requestId
          state.fetchRevisionAtRequest.listByScope[scope] = state.mutationRevision
          state.fetchStatus.listByScope[scope] = 'loading'
          state.fetchError.listByScope[scope] = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          const { scope, tickets } = action.payload
          if (state.latestRequestId.listByScope[scope] !== action.meta.requestId) return
          const revisionAtRequest = state.fetchRevisionAtRequest.listByScope[scope] || 0
          const ids = []
          tickets.forEach((ticket) => {
            const key = ticketEntityKey(ticket)
            if ((state.entityMutationRevisionById[key] || 0) <= revisionAtRequest) storeTicket(state, ticket)
            if (!ids.includes(key)) ids.push(key)
          })
          const mutatedDuringFetch = state.scopeIds[scope].filter((key) => (
            (state.entityMutationRevisionById[key] || 0) > revisionAtRequest && !ids.includes(key)
          ))
          state.scopeIds[scope] = [...mutatedDuringFetch, ...ids]
          state.fetchStatus.listByScope[scope] = 'succeeded'
          state.fetchError.listByScope[scope] = null
        })
        .addCase(thunk.rejected, (state, action) => {
          const scope = thunk === fetchCustomerTickets ? 'customer' : thunk === fetchProviderTickets ? 'provider' : 'support'
          if (state.latestRequestId.listByScope[scope] !== action.meta.requestId) return
          state.fetchStatus.listByScope[scope] = 'failed'
          state.fetchError.listByScope[scope] = action.payload ?? action.error.message
        })
    })

    const detailThunks = [fetchOwnerTicketById, fetchSupportTicketById]
    detailThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state, action) => {
          const ticketId = thunk === fetchOwnerTicketById ? action.meta.arg.ticketId : action.meta.arg
          const key = requestTicketKey(ticketId)
          state.latestRequestId.detailById[key] = action.meta.requestId
          state.fetchRevisionAtRequest.detailById[key] = state.entityMutationRevisionById[key] || 0
          state.fetchStatus.detailById[key] = 'loading'
          state.fetchError.detailById[key] = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          const { ticket, ticketId } = action.payload
          const key = requestTicketKey(ticketId)
          if (state.latestRequestId.detailById[key] !== action.meta.requestId) return
          if ((state.entityMutationRevisionById[key] || 0) > state.fetchRevisionAtRequest.detailById[key]) return
          storeTicket(state, ticket)
          state.fetchStatus.detailById[key] = 'succeeded'
          state.fetchError.detailById[key] = null
        })
        .addCase(thunk.rejected, (state, action) => {
          const ticketId = thunk === fetchOwnerTicketById ? action.meta.arg.ticketId : action.meta.arg
          const key = requestTicketKey(ticketId)
          if (state.latestRequestId.detailById[key] !== action.meta.requestId) return
          state.fetchStatus.detailById[key] = 'failed'
          state.fetchError.detailById[key] = action.payload ?? action.error.message
        })
    })

    addMutationCases(builder, createCustomerTicket, 'createCustomerTicketByRequestKey', (arg) => arg.requestKey, (state, action) => {
      const { ticket } = action.payload
      const key = ticketEntityKey(ticket)
      storeTicketMutation(state, ticket)
      addScopeTicket(state, 'customer', key, true)
    })
    addMutationCases(builder, createProviderTicket, 'createProviderTicketByRequestKey', (arg) => arg.requestKey, (state, action) => {
      const { ticket } = action.payload
      const key = ticketEntityKey(ticket)
      storeTicketMutation(state, ticket)
      addScopeTicket(state, 'provider', key, true)
    })
    addMutationCases(builder, uploadTicketAttachment, 'uploadAttachmentByRequestKey', (requestKey) => requestKey)
    addMutationCases(builder, sendOwnerTicketMessage, 'ownerMessageById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, sendSupportTicketMessage, 'supportMessageById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, saveSupportTicketSolution, 'supportSolutionById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, updateSupportTicketStatus, 'supportStatusById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, updateSupportTicketRemarks, 'supportRemarksById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, resolveSupportTicket, 'supportResolveById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
    addMutationCases(builder, escalateSupportTicket, 'supportEscalateById', (arg) => requestTicketKey(arg.ticketId), (state, action) => {
      storeTicketMutation(state, action.payload.ticket)
    })
  },
})

export const selectTicketsState = (state) => state.tickets
export const selectTicketById = (ticketId) => (state) => state.tickets.entities[requestTicketKey(ticketId)]
export const selectTicketIdsForScope = (scope) => (state) => state.tickets.scopeIds[scope] || []

const scopeSelectors = Object.fromEntries(['customer', 'provider', 'support', 'admin'].map((scope) => [
  scope,
  createSelector(
    [(state) => state.tickets.scopeIds[scope] || [], (state) => state.tickets.entities],
    (ids, entities) => ids.map((ticketId) => entities[ticketId]).filter(Boolean),
  ),
]))

export const selectTicketsForScope = (scope) => (state) => scopeSelectors[scope]?.(state) || []
export const selectTicketListFetchStatus = (scope) => (state) => state.tickets.fetchStatus.listByScope[scope] || 'idle'
export const selectTicketListFetchError = (scope) => (state) => state.tickets.fetchError.listByScope[scope] || null
export const selectTicketDetailFetchStatus = (ticketId) => (state) => state.tickets.fetchStatus.detailById[requestTicketKey(ticketId)] || 'idle'
export const selectTicketDetailFetchError = (ticketId) => (state) => state.tickets.fetchError.detailById[requestTicketKey(ticketId)] || null
export const selectTicketMutationStatus = (operation, key) => (state) => {
  const value = state.tickets.mutationStatus[operation]
  return key === undefined ? value : value?.[key] || 'idle'
}
export const selectTicketMutationError = (operation, key) => (state) => {
  const value = state.tickets.mutationError[operation]
  return key === undefined ? value : value?.[key] || null
}

export default ticketsSlice.reducer
