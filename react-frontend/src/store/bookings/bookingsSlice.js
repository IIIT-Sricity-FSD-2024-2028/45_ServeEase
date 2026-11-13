import { createSlice } from '@reduxjs/toolkit'
import { nonEmptyKey } from '../entityReconciliation.js'

// Bookings are normalized once by id. Customer and provider lists contain only ids, so the
// same booking never has competing copies when both workspaces need to reference it.
// The backend Booking model requires id and every booking endpoint returns that same reference.
export function bookingEntityKey(booking) {
  return nonEmptyKey(booking?.id)
}

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
}

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState: initialBookingsState,
  reducers: {},
})

export const selectBookingsState = (state) => state.bookings
export const selectBookingById = (bookingId) => (state) => state.bookings.entities[bookingId]
export const selectBookingIdsForScope = (scope) => (state) => state.bookings.scopeIds[scope] || []
export const selectBookingsForScope = (scope) => (state) => (state.bookings.scopeIds[scope] || [])
  .map((bookingId) => state.bookings.entities[bookingId])
  .filter(Boolean)
export const selectBookingListFetchStatus = (scope) => (state) => state.bookings.fetchStatus.listByScope[scope] || 'idle'
export const selectBookingListFetchError = (scope) => (state) => state.bookings.fetchError.listByScope[scope] || null
export const selectBookingDetailFetchStatus = (bookingId) => (state) => state.bookings.fetchStatus.detailById[bookingId] || 'idle'
export const selectBookingDetailFetchError = (bookingId) => (state) => state.bookings.fetchError.detailById[bookingId] || null
export const selectBookingMutationStatus = (operation, bookingId) => (state) => {
  const value = state.bookings.mutationStatus[operation]
  return bookingId === undefined ? value : value?.[bookingId] || 'idle'
}
export const selectBookingMutationError = (operation, bookingId) => (state) => {
  const value = state.bookings.mutationError[operation]
  return bookingId === undefined ? value : value?.[bookingId] || null
}

export default bookingsSlice.reducer
