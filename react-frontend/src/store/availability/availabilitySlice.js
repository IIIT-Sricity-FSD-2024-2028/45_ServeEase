import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { availabilityApi } from '../../services/api.js'
import { nonEmptyKey, replaceFullRecord } from '../entityReconciliation.js'

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

// Verified response contracts (apiRequest unwraps the backend's { success, data } envelope):
// - GET  /availability/providers/:id                         → ProviderAvailability (generated, read-only)
// - GET  /availability/providers/:id/weekly-schedule         → WeeklySchedule (complete record)
// - PUT  /availability/providers/:id/weekly-schedule         → WeeklySchedule (complete record) → replace
// - GET  /availability/providers/:id/date-overrides          → DateOverride[] (complete list)
// - PUT  /availability/providers/:id/date-overrides/:date    → DateOverride (complete record) → upsert by date
// - DELETE /availability/providers/:id/date-overrides/:date  → the removed DateOverride → remove by date
// The backend canonicalizes the provider id it echoes back, so caches use the key that was sent,
// never the providerId inside a response.

function errorText(error) { return error?.message || String(error ?? 'Request failed') }
const reject = (error, api) => api.rejectWithValue(errorText(error))
const missingProvider = (api) => api.rejectWithValue('Provider id is required.')
const missingDate = (api) => api.rejectWithValue('Date is required.')

// A fetch for a key already in flight is not repeated: the pending request fills the same cache.
const notAlreadyLoading = (branch) => (providerId, { getState }) => {
  const key = availabilityProviderKey(providerId)
  return Boolean(key) && getState().availability?.fetchStatus[branch][key] !== 'loading'
}

export const fetchProviderAvailability = createAsyncThunk('availability/fetchProviderAvailability', async (providerId, api) => {
  const providerKey = availabilityProviderKey(providerId)
  if (!providerKey) return missingProvider(api)
  try { return { providerKey, availability: await availabilityApi.get(providerKey) } } catch (error) { return reject(error, api) }
}, { condition: notAlreadyLoading('availabilityByProviderId') })

export const fetchProviderWeeklySchedule = createAsyncThunk('availability/fetchProviderWeeklySchedule', async (providerId, api) => {
  const providerKey = availabilityProviderKey(providerId)
  if (!providerKey) return missingProvider(api)
  try { return { providerKey, weeklySchedule: await availabilityApi.getWeeklySchedule(providerKey) } } catch (error) { return reject(error, api) }
}, { condition: notAlreadyLoading('weeklyScheduleByProviderId') })

export const fetchProviderDateOverrides = createAsyncThunk('availability/fetchProviderDateOverrides', async (providerId, api) => {
  const providerKey = availabilityProviderKey(providerId)
  if (!providerKey) return missingProvider(api)
  try { return { providerKey, dateOverrides: await availabilityApi.getDateOverrides(providerKey) } } catch (error) { return reject(error, api) }
}, { condition: notAlreadyLoading('dateOverridesByProviderId') })

export const saveWeeklySchedule = createAsyncThunk('availability/saveWeeklySchedule', async ({ providerId, weeklySchedule }, api) => {
  const providerKey = availabilityProviderKey(providerId)
  if (!providerKey) return missingProvider(api)
  try { return { providerKey, weeklySchedule: await availabilityApi.saveWeeklySchedule(providerKey, weeklySchedule) } } catch (error) { return reject(error, api) }
})

export const saveProviderDateOverride = createAsyncThunk('availability/saveProviderDateOverride', async ({ providerId, date, override }, api) => {
  const providerKey = availabilityProviderKey(providerId)
  const dateKey = nonEmptyKey(date)
  if (!providerKey) return missingProvider(api)
  if (!dateKey) return missingDate(api)
  try { return { providerKey, date: dateKey, dateOverride: await availabilityApi.saveDateOverride(providerKey, dateKey, override) } } catch (error) { return reject(error, api) }
})

export const deleteProviderDateOverride = createAsyncThunk('availability/deleteProviderDateOverride', async ({ providerId, date }, api) => {
  const providerKey = availabilityProviderKey(providerId)
  const dateKey = nonEmptyKey(date)
  if (!providerKey) return missingProvider(api)
  if (!dateKey) return missingDate(api)
  try { return { providerKey, date: dateKey, dateOverride: await availabilityApi.deleteDateOverride(providerKey, dateKey) } } catch (error) { return reject(error, api) }
})

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
  // Status ownership: only the latest request started for a status key may settle that status,
  // so an older response that arrives late cannot overwrite a newer request's state.
  latestRequestId: {
    availabilityByProviderId: {},
    weeklyScheduleByProviderId: {},
    dateOverridesByProviderId: {},
    saveWeeklyScheduleByProviderId: {},
    saveDateOverrideByKey: {},
    deleteDateOverrideByKey: {},
  },
  // Data ownership: a fetch and a mutation of the same cached resource race. The last request
  // started for that resource owns its cached data, so a fetch that began before a save cannot
  // replace the saved record with a pre-save response. `dateOverrideByKey` orders save/delete of
  // the same provider date.
  latestWriteRequestId: {
    weeklyScheduleByProviderId: {},
    dateOverridesByProviderId: {},
    dateOverrideByKey: {},
  },
}

const providerKeyOf = (action) => availabilityProviderKey(action.meta.arg?.providerId ?? action.meta.arg)
const overrideKeyOf = (action) => dateOverrideRequestKey(action.meta.arg?.providerId, action.meta.arg?.date)
const rejection = (action) => action.payload ?? action.error.message

function fetchCases(builder, thunk, branch, write) {
  builder
    .addCase(thunk.pending, (state, action) => {
      const key = providerKeyOf(action)
      if (!key) return
      state.latestRequestId[branch][key] = action.meta.requestId
      if (Object.hasOwn(state.latestWriteRequestId, branch)) state.latestWriteRequestId[branch][key] = action.meta.requestId
      state.fetchStatus[branch][key] = 'loading'
      state.fetchError[branch][key] = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const key = action.payload.providerKey
      if (state.latestRequestId[branch][key] !== action.meta.requestId) return
      const ownsData = !Object.hasOwn(state.latestWriteRequestId, branch) || state.latestWriteRequestId[branch][key] === action.meta.requestId
      // A superseded fetch still fills an empty cache; it never replaces data written by a newer request.
      if (ownsData || !Object.hasOwn(state[branch], key)) write(state, key, action.payload)
      state.fetchStatus[branch][key] = 'succeeded'
      state.fetchError[branch][key] = null
    })
    .addCase(thunk.rejected, (state, action) => {
      const key = providerKeyOf(action)
      if (!key || state.latestRequestId[branch][key] !== action.meta.requestId) return
      // Previously loaded data is retained; callers decide whether a failed refresh hides it.
      state.fetchStatus[branch][key] = 'failed'
      state.fetchError[branch][key] = rejection(action)
    })
}

function mutationCases(builder, thunk, branch, keyOf, { onPending, onFulfilled }) {
  builder
    .addCase(thunk.pending, (state, action) => {
      const key = keyOf(action)
      if (!key) return
      state.latestRequestId[branch][key] = action.meta.requestId
      onPending(state, action)
      state.mutationStatus[branch][key] = 'loading'
      state.mutationError[branch][key] = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      onFulfilled(state, action)
      const key = keyOf(action)
      if (state.latestRequestId[branch][key] !== action.meta.requestId) return
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

const asList = (value) => (Array.isArray(value) ? value : [])

function claimOverrideWrite(state, action) {
  const providerKey = providerKeyOf(action)
  state.latestWriteRequestId.dateOverridesByProviderId[providerKey] = action.meta.requestId
  state.latestWriteRequestId.dateOverrideByKey[overrideKeyOf(action)] = action.meta.requestId
}

// Override mutations patch one date in an already-loaded list. They never create a list that was
// not fetched, because a single record is not the provider's complete override list.
function patchOverride(state, action, patch) {
  const { providerKey, date } = action.payload
  if (state.latestWriteRequestId.dateOverrideByKey[dateOverrideRequestKey(providerKey, date)] !== action.meta.requestId) return
  const list = state.dateOverridesByProviderId[providerKey]
  if (!Array.isArray(list)) return
  state.dateOverridesByProviderId[providerKey] = patch(list.filter((item) => item?.date !== date))
}

const availabilitySlice = createSlice({
  name: 'availability',
  initialState: initialAvailabilityState,
  reducers: {},
  extraReducers: (builder) => {
    fetchCases(builder, fetchProviderAvailability, 'availabilityByProviderId', (state, key, payload) => { state.availabilityByProviderId[key] = payload.availability })
    fetchCases(builder, fetchProviderWeeklySchedule, 'weeklyScheduleByProviderId', (state, key, payload) => { state.weeklyScheduleByProviderId[key] = replaceFullRecord(payload.weeklySchedule) })
    fetchCases(builder, fetchProviderDateOverrides, 'dateOverridesByProviderId', (state, key, payload) => { state.dateOverridesByProviderId[key] = asList(payload.dateOverrides) })

    mutationCases(builder, saveWeeklySchedule, 'saveWeeklyScheduleByProviderId', providerKeyOf, {
      onPending: (state, action) => { state.latestWriteRequestId.weeklyScheduleByProviderId[providerKeyOf(action)] = action.meta.requestId },
      onFulfilled: (state, action) => {
        const { providerKey, weeklySchedule } = action.payload
        if (state.latestWriteRequestId.weeklyScheduleByProviderId[providerKey] === action.meta.requestId) state.weeklyScheduleByProviderId[providerKey] = replaceFullRecord(weeklySchedule)
      },
    })
    mutationCases(builder, saveProviderDateOverride, 'saveDateOverrideByKey', overrideKeyOf, {
      onPending: claimOverrideWrite,
      onFulfilled: (state, action) => patchOverride(state, action, (list) => [...list, replaceFullRecord(action.payload.dateOverride)]),
    })
    mutationCases(builder, deleteProviderDateOverride, 'deleteDateOverrideByKey', overrideKeyOf, {
      onPending: claimOverrideWrite,
      onFulfilled: (state, action) => patchOverride(state, action, (list) => list),
    })
  },
})

const byKey = (map, providerId) => map[availabilityProviderKey(providerId)]

export const selectAvailabilityState = (state) => state.availability
// Whole maps keyed by provider id, for pages that read many providers' availability at once.
export const selectProviderAvailabilityMap = (state) => state.availability.availabilityByProviderId
export const selectProviderAvailabilityFetchStatusMap = (state) => state.availability.fetchStatus.availabilityByProviderId

export const selectProviderAvailability = (providerId) => (state) => byKey(state.availability.availabilityByProviderId, providerId) ?? null
export const selectProviderWeeklySchedule = (providerId) => (state) => byKey(state.availability.weeklyScheduleByProviderId, providerId) ?? null
export const selectProviderDateOverrides = (providerId) => (state) => byKey(state.availability.dateOverridesByProviderId, providerId) ?? null
export const selectProviderAvailabilityFetchStatus = (providerId) => (state) => byKey(state.availability.fetchStatus.availabilityByProviderId, providerId) || 'idle'
export const selectProviderAvailabilityFetchError = (providerId) => (state) => byKey(state.availability.fetchError.availabilityByProviderId, providerId) || null
export const selectProviderWeeklyScheduleFetchStatus = (providerId) => (state) => byKey(state.availability.fetchStatus.weeklyScheduleByProviderId, providerId) || 'idle'
export const selectProviderWeeklyScheduleFetchError = (providerId) => (state) => byKey(state.availability.fetchError.weeklyScheduleByProviderId, providerId) || null
export const selectProviderDateOverridesFetchStatus = (providerId) => (state) => byKey(state.availability.fetchStatus.dateOverridesByProviderId, providerId) || 'idle'
export const selectProviderDateOverridesFetchError = (providerId) => (state) => byKey(state.availability.fetchError.dateOverridesByProviderId, providerId) || null

// Generic mutation selectors take a mutation branch name and its already-built key.
export const selectAvailabilityMutationStatus = (operation, key) => (state) => state.availability.mutationStatus[operation]?.[key] || 'idle'
export const selectAvailabilityMutationError = (operation, key) => (state) => state.availability.mutationError[operation]?.[key] || null
export const selectSaveWeeklyScheduleMutationStatus = (providerId) => selectAvailabilityMutationStatus('saveWeeklyScheduleByProviderId', availabilityProviderKey(providerId))
export const selectSaveWeeklyScheduleMutationError = (providerId) => selectAvailabilityMutationError('saveWeeklyScheduleByProviderId', availabilityProviderKey(providerId))
export const selectSaveDateOverrideMutationStatus = (providerId, date) => selectAvailabilityMutationStatus('saveDateOverrideByKey', dateOverrideRequestKey(providerId, date))
export const selectSaveDateOverrideMutationError = (providerId, date) => selectAvailabilityMutationError('saveDateOverrideByKey', dateOverrideRequestKey(providerId, date))
export const selectDeleteDateOverrideMutationStatus = (providerId, date) => selectAvailabilityMutationStatus('deleteDateOverrideByKey', dateOverrideRequestKey(providerId, date))
export const selectDeleteDateOverrideMutationError = (providerId, date) => selectAvailabilityMutationError('deleteDateOverrideByKey', dateOverrideRequestKey(providerId, date))

export default availabilitySlice.reducer
