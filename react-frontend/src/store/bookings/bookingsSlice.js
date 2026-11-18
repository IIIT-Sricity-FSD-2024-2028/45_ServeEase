import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { bookingsApi } from '../../services/api.js'
import { nonEmptyKey, replaceFullRecord } from '../entityReconciliation.js'

// Bookings are normalized once by id. Customer and provider lists contain only ids, so the
// same booking never has competing copies when both workspaces need to reference it.
// The backend Booking model requires id and every booking endpoint returns that same reference.
export function bookingEntityKey(booking) {
  return nonEmptyKey(booking?.id)
}

const requiredFullBookingFields = [
  'id', 'service', 'provider', 'providerId', 'date', 'time', 'address', 'status', 'category',
  'paymentStatus', 'amount', 'customerName', 'customerPhone', 'customerEmail', 'createdAt',
]

function isFullBooking(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    requiredFullBookingFields.every((field) => value[field] !== undefined) && bookingEntityKey(value))
}

function errorMessage(error) {
  return error?.message || String(error ?? 'Booking request failed.')
}

function rejectWithMessage(error, api) {
  return api.rejectWithValue(errorMessage(error))
}

function requireBookingId(bookingId, api) {
  const key = nonEmptyKey(bookingId)
  return key || api.rejectWithValue('Booking id is required.')
}

async function fullBookingOrRefetch(value, fallbackId, api) {
  if (isFullBooking(value)) return value
  const id = bookingEntityKey(value) || nonEmptyKey(fallbackId)
  if (!id) throw new Error('The booking service returned an incomplete booking without an id.')
  return api.dispatch(fetchBookingDetail(id)).unwrap()
}

async function fullBookingListOrRefetch(value, api) {
  if (!Array.isArray(value)) throw new Error('The booking service returned an invalid response.')
  return Promise.all(value.map((record) => fullBookingOrRefetch(record, undefined, api)))
}

export const fetchCustomerBookings = createAsyncThunk('bookings/fetchCustomerBookings', async (_arg, api) => {
  try {
    return { scope: 'customer', records: await fullBookingListOrRefetch(await bookingsApi.list(), api) }
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const fetchProviderBookings = createAsyncThunk('bookings/fetchProviderBookings', async (_arg, api) => {
  try {
    return { scope: 'provider', records: await fullBookingListOrRefetch(await bookingsApi.listForProvider(), api) }
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const fetchBookingDetail = createAsyncThunk('bookings/fetchBookingDetail', async (bookingId, api) => {
  const key = requireBookingId(bookingId, api)
  if (typeof key !== 'string') return key
  try {
    let record = await bookingsApi.get(key)
    if (!isFullBooking(record)) record = await bookingsApi.get(key)
    if (!isFullBooking(record)) throw new Error('The booking detail response was incomplete after one retry.')
    if (bookingEntityKey(record) !== key) throw new Error('The booking detail response used a different booking id.')
    return record
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const createCustomerBooking = createAsyncThunk('bookings/createCustomerBooking', async ({ requestKey, booking } = {}, api) => {
  if (typeof requestKey !== 'string' || !requestKey.trim()) return api.rejectWithValue('A booking request key is required.')
  try {
    return await fullBookingOrRefetch(await bookingsApi.createForCustomer(booking), undefined, api)
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const cancelBooking = createAsyncThunk('bookings/cancelBooking', async ({ bookingId } = {}, api) => {
  const key = requireBookingId(bookingId, api)
  if (typeof key !== 'string') return key
  try {
    const latest = await api.dispatch(fetchBookingDetail(key)).unwrap()
    if (!['Pending', 'Accepted'].includes(latest.status)) {
      throw new Error(`This booking is ${String(latest.status).toLowerCase()} and can no longer be cancelled.`)
    }
    return await fullBookingOrRefetch(await bookingsApi.updateStatus(key, 'Cancelled'), key, api)
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const rescheduleBooking = createAsyncThunk('bookings/rescheduleBooking', async ({ bookingId, date, time } = {}, api) => {
  const key = requireBookingId(bookingId, api)
  if (typeof key !== 'string') return key
  try {
    const latest = await api.dispatch(fetchBookingDetail(key)).unwrap()
    if (latest.status !== 'Pending') {
      throw new Error(`This booking is ${String(latest.status).toLowerCase()} and can no longer be rescheduled.`)
    }
    return await fullBookingOrRefetch(await bookingsApi.reschedule(key, { date, time, stateVersion: latest.stateVersion }), key, api)
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const updateProviderBookingStatus = createAsyncThunk('bookings/updateProviderBookingStatus', async ({ bookingId, status, stateVersion, rejectionReason } = {}, api) => {
  const key = requireBookingId(bookingId, api)
  if (typeof key !== 'string') return key
  try {
    return await fullBookingOrRefetch(await bookingsApi.updateProviderStatus(key, status, stateVersion, rejectionReason), key, api)
  } catch (error) {
    return rejectWithMessage(error, api)
  }
})

export const initialBookingsState = {
  entities: {},
  scopeIds: {
    customer: [],
    provider: [],
  },
  fetchStatus: {
    listByScope: { customer: 'idle', provider: 'idle' },
    detailById: {},
  },
  fetchError: {
    listByScope: { customer: null, provider: null },
    detailById: {},
  },
  mutationStatus: {
    createCustomerBookingByRequestKey: {},
    cancelById: {},
    rescheduleById: {},
    providerStatusById: {},
  },
  mutationError: {
    createCustomerBookingByRequestKey: {},
    cancelById: {},
    rescheduleById: {},
    providerStatusById: {},
  },
  latestRequestId: {
    listByScope: { customer: null, provider: null },
    detailById: {},
    createCustomerBookingByRequestKey: {},
    cancelById: {},
    rescheduleById: {},
    providerStatusById: {},
  },
}

function addScopeId(state, scope, bookingId) {
  if (!scope || !bookingId || state.scopeIds[scope].includes(bookingId)) return
  state.scopeIds[scope].push(bookingId)
}

function setFullEntity(state, booking) {
  const id = bookingEntityKey(booking)
  if (!id) return null
  state.entities[id] = replaceFullRecord(booking)
  return id
}

function setFullList(state, scope, records) {
  const ids = []
  records.forEach((record) => {
    const id = setFullEntity(state, record)
    if (id && !ids.includes(id)) ids.push(id)
  })
  state.scopeIds[scope] = ids
}

function rejection(action) {
  return action.payload || action.error?.message || 'Booking request failed.'
}

function listCases(builder, thunk, scope) {
  builder
    .addCase(thunk.pending, (state, action) => {
      state.latestRequestId.listByScope[scope] = action.meta.requestId
      state.fetchStatus.listByScope[scope] = 'loading'
      state.fetchError.listByScope[scope] = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      if (state.latestRequestId.listByScope[scope] !== action.meta.requestId) return
      setFullList(state, scope, action.payload.records)
      state.fetchStatus.listByScope[scope] = 'succeeded'
      state.fetchError.listByScope[scope] = null
    })
    .addCase(thunk.rejected, (state, action) => {
      if (state.latestRequestId.listByScope[scope] !== action.meta.requestId) return
      state.fetchStatus.listByScope[scope] = 'failed'
      state.fetchError.listByScope[scope] = rejection(action)
    })
}

function mutationCases(builder, thunk, branch, keyOf, scope) {
  builder
    .addCase(thunk.pending, (state, action) => {
      const key = keyOf(action)
      if (!key) return
      state.latestRequestId[branch][key] = action.meta.requestId
      state.mutationStatus[branch][key] = 'loading'
      state.mutationError[branch][key] = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const key = keyOf(action)
      if (!key || state.latestRequestId[branch][key] !== action.meta.requestId) return
      const id = setFullEntity(state, action.payload)
      addScopeId(state, scope, id)
      state.mutationStatus[branch][key] = 'succeeded'
      state.mutationError[branch][key] = null
    })
    .addCase(thunk.rejected, (state, action) => {
      const key = keyOf(action)
      if (!key || state.latestRequestId[branch][key] !== action.meta.requestId) return
      state.mutationStatus[branch][key] = 'failed'
      state.mutationError[branch][key] = rejection(action)
    })
}

const bookingIdFromArg = (action) => nonEmptyKey(action.meta.arg?.bookingId)
const requestKeyFromArg = (action) => typeof action.meta.arg?.requestKey === 'string' && action.meta.arg.requestKey.trim() ? action.meta.arg.requestKey : null

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState: initialBookingsState,
  reducers: {},
  extraReducers: (builder) => {
    listCases(builder, fetchCustomerBookings, 'customer')
    listCases(builder, fetchProviderBookings, 'provider')

    builder
      .addCase(fetchBookingDetail.pending, (state, action) => {
        const key = nonEmptyKey(action.meta.arg)
        if (!key) return
        state.latestRequestId.detailById[key] = action.meta.requestId
        state.fetchStatus.detailById[key] = 'loading'
        state.fetchError.detailById[key] = null
      })
      .addCase(fetchBookingDetail.fulfilled, (state, action) => {
        const key = nonEmptyKey(action.meta.arg)
        if (!key || state.latestRequestId.detailById[key] !== action.meta.requestId) return
        setFullEntity(state, action.payload)
        state.fetchStatus.detailById[key] = 'succeeded'
        state.fetchError.detailById[key] = null
      })
      .addCase(fetchBookingDetail.rejected, (state, action) => {
        const key = nonEmptyKey(action.meta.arg)
        if (!key || state.latestRequestId.detailById[key] !== action.meta.requestId) return
        state.fetchStatus.detailById[key] = 'failed'
        state.fetchError.detailById[key] = rejection(action)
      })

    mutationCases(builder, createCustomerBooking, 'createCustomerBookingByRequestKey', requestKeyFromArg, 'customer')
    mutationCases(builder, cancelBooking, 'cancelById', bookingIdFromArg, 'customer')
    mutationCases(builder, rescheduleBooking, 'rescheduleById', bookingIdFromArg, 'customer')
    mutationCases(builder, updateProviderBookingStatus, 'providerStatusById', bookingIdFromArg, 'provider')
  },
})

export const selectBookingsState = (state) => state.bookings
export const selectBookingEntities = (state) => state.bookings.entities
export const selectBookingById = (bookingId) => (state) => state.bookings.entities[bookingId]
export const selectBookingIdsForScope = (scope) => (state) => state.bookings.scopeIds[scope] || []
const selectCustomerScopeIds = (state) => state.bookings.scopeIds.customer
const selectProviderScopeIds = (state) => state.bookings.scopeIds.provider
const recordsForScope = (ids, entities) => ids.map((bookingId) => entities[bookingId]).filter(Boolean)
export const selectCustomerBookings = createSelector([selectCustomerScopeIds, selectBookingEntities], recordsForScope)
export const selectProviderBookings = createSelector([selectProviderScopeIds, selectBookingEntities], recordsForScope)
export const selectCustomerBookingIds = (state) => state.bookings.scopeIds.customer
export const selectProviderBookingIds = (state) => state.bookings.scopeIds.provider
export const selectBookingListFetchStatus = (scope) => (state) => state.bookings.fetchStatus.listByScope[scope] || 'idle'
export const selectBookingListFetchError = (scope) => (state) => state.bookings.fetchError.listByScope[scope] || null
export const selectCustomerBookingsFetchStatus = (state) => selectBookingListFetchStatus('customer')(state)
export const selectCustomerBookingsFetchError = (state) => selectBookingListFetchError('customer')(state)
export const selectProviderBookingsFetchStatus = (state) => selectBookingListFetchStatus('provider')(state)
export const selectProviderBookingsFetchError = (state) => selectBookingListFetchError('provider')(state)
export const selectBookingDetailFetchStatus = (bookingId) => (state) => state.bookings.fetchStatus.detailById[bookingId] || 'idle'
export const selectBookingDetailFetchError = (bookingId) => (state) => state.bookings.fetchError.detailById[bookingId] || null
export const selectBookingMutationStatus = (operation, bookingId) => (state) => {
  const value = (state.bookings || initialBookingsState).mutationStatus[operation]
  return bookingId === undefined ? value : value?.[bookingId] || 'idle'
}
export const selectBookingMutationError = (operation, bookingId) => (state) => {
  const value = (state.bookings || initialBookingsState).mutationError[operation]
  return bookingId === undefined ? value : value?.[bookingId] || null
}
export const selectCreateCustomerBookingMutationStatus = (requestKey) => (state) => state.bookings.mutationStatus.createCustomerBookingByRequestKey[requestKey] || 'idle'
export const selectCreateCustomerBookingMutationError = (requestKey) => (state) => state.bookings.mutationError.createCustomerBookingByRequestKey[requestKey] || null
export const selectCancelBookingMutationStatus = (bookingId) => selectBookingMutationStatus('cancelById', bookingId)
export const selectCancelBookingMutationError = (bookingId) => selectBookingMutationError('cancelById', bookingId)
export const selectRescheduleBookingMutationStatus = (bookingId) => selectBookingMutationStatus('rescheduleById', bookingId)
export const selectRescheduleBookingMutationError = (bookingId) => selectBookingMutationError('rescheduleById', bookingId)
export const selectProviderBookingStatusMutationStatus = (bookingId) => selectBookingMutationStatus('providerStatusById', bookingId)
export const selectProviderBookingStatusMutationError = (bookingId) => selectBookingMutationError('providerStatusById', bookingId)
export default bookingsSlice.reducer
