import { createSlice } from '@reduxjs/toolkit'
import { nonEmptyKey } from '../entityReconciliation.js'

// Server-backed availability is keyed by provider and separated by endpoint resource. Temporary
// date selections, form drafts, and modal visibility remain component state when pages migrate.
// This key is the exact provider id sent to availabilityApi; callers resolve a catalog listing's
// owner with the existing availabilityProviderId helper before using the store.
export function availabilityProviderKey(providerId) {
  return nonEmptyKey(providerId)
}

export function dateOverrideRequestKey(providerId, date) {
  const providerKey = availabilityProviderKey(providerId)
  const dateKey = nonEmptyKey(date)
  return providerKey && dateKey ? JSON.stringify([providerKey, dateKey]) : null
}

export const initialAvailabilityState = {
  availabilityByProviderId: {},
  weeklyScheduleByProviderId: {},
  dateOverridesByProviderId: {},
  fetchStatus: {
    availabilityByProviderId: {},
    weeklyScheduleByProviderId: {},
    dateOverridesByProviderId: {},
  },
  fetchError: {
    availabilityByProviderId: {},
    weeklyScheduleByProviderId: {},
    dateOverridesByProviderId: {},
  },
  mutationStatus: {
    saveWeeklyScheduleByProviderId: {},
    saveDateOverrideByKey: {},
    deleteDateOverrideByKey: {},
  },
  mutationError: {
    saveWeeklyScheduleByProviderId: {},
    saveDateOverrideByKey: {},
    deleteDateOverrideByKey: {},
  },
}

const availabilitySlice = createSlice({
  name: 'availability',
  initialState: initialAvailabilityState,
  reducers: {},
})

export const selectAvailabilityState = (state) => state.availability
export const selectProviderAvailability = (providerId) => (state) => state.availability.availabilityByProviderId[providerId] ?? null
export const selectProviderWeeklySchedule = (providerId) => (state) => state.availability.weeklyScheduleByProviderId[providerId] ?? null
export const selectProviderDateOverrides = (providerId) => (state) => state.availability.dateOverridesByProviderId[providerId] ?? null
export const selectProviderAvailabilityFetchStatus = (providerId) => (state) => state.availability.fetchStatus.availabilityByProviderId[providerId] || 'idle'
export const selectProviderAvailabilityFetchError = (providerId) => (state) => state.availability.fetchError.availabilityByProviderId[providerId] || null
export const selectProviderWeeklyScheduleFetchStatus = (providerId) => (state) => state.availability.fetchStatus.weeklyScheduleByProviderId[providerId] || 'idle'
export const selectProviderWeeklyScheduleFetchError = (providerId) => (state) => state.availability.fetchError.weeklyScheduleByProviderId[providerId] || null
export const selectProviderDateOverridesFetchStatus = (providerId) => (state) => state.availability.fetchStatus.dateOverridesByProviderId[providerId] || 'idle'
export const selectProviderDateOverridesFetchError = (providerId) => (state) => state.availability.fetchError.dateOverridesByProviderId[providerId] || null
export const selectAvailabilityMutationStatus = (operation, key) => (state) => state.availability.mutationStatus[operation]?.[key] || 'idle'
export const selectAvailabilityMutationError = (operation, key) => (state) => state.availability.mutationError[operation]?.[key] || null

export default availabilitySlice.reducer
