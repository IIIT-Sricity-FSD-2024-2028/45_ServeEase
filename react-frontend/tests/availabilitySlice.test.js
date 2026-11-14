import test, { afterEach } from 'node:test'
import { register } from 'node:module'
import assert from 'node:assert/strict'
import { configureStore } from '@reduxjs/toolkit'

register('./support/jsx-hooks.mjs', import.meta.url)

const {
  default: availability,
  availabilityProviderKey,
  dateOverrideRequestKey,
  deleteProviderDateOverride,
  fetchProviderAvailability,
  fetchProviderDateOverrides,
  fetchProviderWeeklySchedule,
  initialAvailabilityState,
  saveProviderDateOverride,
  saveWeeklySchedule,
  selectDeleteDateOverrideMutationError,
  selectDeleteDateOverrideMutationStatus,
  selectProviderAvailability,
  selectProviderAvailabilityFetchError,
  selectProviderAvailabilityFetchStatus,
  selectProviderDateOverrides,
  selectProviderDateOverridesFetchStatus,
  selectProviderWeeklySchedule,
  selectProviderWeeklyScheduleFetchStatus,
  selectSaveDateOverrideMutationError,
  selectSaveDateOverrideMutationStatus,
  selectSaveWeeklyScheduleMutationError,
  selectSaveWeeklyScheduleMutationStatus,
} = await import('../src/store/availability/availabilitySlice.js')
const { availabilityProviderId } = await import('../src/features/discovery/catalogModel.js')

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function response(data, status = 200) {
  const ok = status >= 200 && status < 300
  return { ok, status, json: async () => ok ? { success: true, data } : { success: false, message: data } }
}
function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
// Records every request and answers with `handler({ path, method, body })`.
function storeWithFetch(handler) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    const path = decodeURI(new URL(url).pathname).replace(/^\/api/, '')
    const call = { path, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined }
    calls.push(call)
    return handler(call)
  }
  return { store: configureStore({ reducer: { availability } }), calls }
}
const state = (store) => store.getState()
const generated = (providerId, dates) => ({ providerId, bookingWindowDays: 7, dates })
const weekly = (providerId, monday) => ({ providerId, effectiveFrom: '2026-11-14', weeklySchedule: { monday, tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] } })

test('keys use the exact provider id sent to the API and resolve listings to their owning account', () => {
  assert.equal(availabilityProviderKey('  PRV-1 '), 'PRV-1')
  assert.equal(availabilityProviderKey(''), null)
  assert.equal(availabilityProviderKey(undefined), null)
  assert.equal(dateOverrideRequestKey('PRV-1', '2026-11-20'), JSON.stringify(['PRV-1', '2026-11-20']))
  assert.equal(dateOverrideRequestKey('PRV-1', ''), null)
  assert.notEqual(dateOverrideRequestKey('PRV-1', '2026-11-20'), dateOverrideRequestKey('PRV-2', '2026-11-20'))
  // A catalog listing with an owner account is looked up by that account, never by the listing id.
  assert.equal(availabilityProviderId({ id: 'listing-7', ownerProviderId: 'PRV-7' }), 'PRV-7')
  assert.equal(availabilityProviderId({ id: 'listing-8' }), 'listing-8')
})

test('fetchProviderAvailability stores the unmodified response under the requested id', async () => {
  const body = generated('prv-1', [{ date: '2026-11-15', dayOfWeek: 'Sunday', slots: ['09:00-10:00'], scheduledSlots: ['09:00-10:00'], slotStates: { '09:00-10:00': 'available' } }])
  const { store, calls } = storeWithFetch(() => response(body))
  const action = await store.dispatch(fetchProviderAvailability('PRV-1'))
  assert.equal(action.type, 'availability/fetchProviderAvailability/fulfilled')
  assert.deepEqual(calls, [{ path: '/availability/providers/PRV-1', method: 'GET', body: undefined }])
  // The backend echoes a canonicalized id; the cache stays keyed by the id that was requested.
  assert.deepEqual(selectProviderAvailability('PRV-1')(state(store)), body)
  assert.equal(selectProviderAvailability('prv-1')(state(store)), null)
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-1')(state(store)), 'succeeded')
  assert.deepEqual(JSON.parse(JSON.stringify(state(store))), state(store))
})

test('a failed availability fetch reports the backend message and keeps earlier data', async () => {
  let fail = false
  const body = generated('PRV-1', [])
  const { store } = storeWithFetch(() => (fail ? response('Provider id is required.', 400) : response(body)))
  await store.dispatch(fetchProviderAvailability('PRV-1'))
  fail = true
  const action = await store.dispatch(fetchProviderAvailability('PRV-1'))
  assert.equal(action.type, 'availability/fetchProviderAvailability/rejected')
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-1')(state(store)), 'failed')
  assert.equal(selectProviderAvailabilityFetchError('PRV-1')(state(store)), 'Provider id is required.')
  assert.deepEqual(selectProviderAvailability('PRV-1')(state(store)), body)

  const missing = await store.dispatch(fetchProviderAvailability(''))
  assert.equal(missing.meta.condition, true, 'an empty id is never requested')
})

test('concurrent fetches for different providers resolve independently, in any order', async () => {
  const gates = { 'PRV-A': deferred(), 'PRV-B': deferred() }
  const { store } = storeWithFetch(async ({ path }) => {
    const id = path.split('/')[3]
    await gates[id].promise
    return id === 'PRV-A' ? response('A is unavailable', 500) : response(generated(id, [{ date: '2026-11-15', slots: ['10:00-11:00'] }]))
  })
  const first = store.dispatch(fetchProviderAvailability('PRV-A'))
  const second = store.dispatch(fetchProviderAvailability('PRV-B'))
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-A')(state(store)), 'loading')
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-B')(state(store)), 'loading')
  gates['PRV-B'].resolve(); await second
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-A')(state(store)), 'loading')
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-B')(state(store)), 'succeeded')
  gates['PRV-A'].resolve(); await first
  assert.equal(selectProviderAvailabilityFetchStatus('PRV-A')(state(store)), 'failed')
  assert.equal(selectProviderAvailabilityFetchError('PRV-B')(state(store)), null)
  assert.equal(selectProviderAvailability('PRV-B')(state(store)).dates[0].slots[0], '10:00-11:00')
  assert.equal(selectProviderAvailability('PRV-A')(state(store)), null)
})

test('a fetch already in flight for the same provider is reused, not repeated', async () => {
  const gate = deferred()
  const { store, calls } = storeWithFetch(async () => { await gate.promise; return response(generated('PRV-1', [])) })
  const first = store.dispatch(fetchProviderAvailability('PRV-1'))
  const repeat = await store.dispatch(fetchProviderAvailability('PRV-1'))
  assert.equal(repeat.meta.condition, true)
  gate.resolve(); await first
  assert.equal(calls.length, 1)
  await store.dispatch(fetchProviderAvailability('PRV-1'))
  assert.equal(calls.length, 2, 'a later mount refreshes again')
})

test('weekly schedule fetch and save replace the complete record and track separate states', async () => {
  const saved = weekly('PRV-1', ['09:00-12:00'])
  const { store, calls } = storeWithFetch(({ method }) => response(method === 'PUT' ? saved : weekly('PRV-1', [])))
  await store.dispatch(fetchProviderWeeklySchedule('PRV-1'))
  assert.deepEqual(selectProviderWeeklySchedule('PRV-1')(state(store)).weeklySchedule.monday, [])

  const pending = store.dispatch(saveWeeklySchedule({ providerId: 'PRV-1', weeklySchedule: saved.weeklySchedule }))
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-1')(state(store)), 'loading')
  assert.equal(selectProviderWeeklyScheduleFetchStatus('PRV-1')(state(store)), 'succeeded', 'a mutation never reuses fetch state')
  const action = await pending
  assert.deepEqual(action.payload.weeklySchedule, saved)
  assert.deepEqual(calls[1], { path: '/availability/providers/PRV-1/weekly-schedule', method: 'PUT', body: { weeklySchedule: saved.weeklySchedule } })
  assert.deepEqual(selectProviderWeeklySchedule('PRV-1')(state(store)), saved)
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-1')(state(store)), 'succeeded')
})

test('a failed weekly save reports the backend message and leaves the cached schedule unchanged', async () => {
  const original = weekly('PRV-1', ['09:00-12:00'])
  const { store } = storeWithFetch(({ method }) => (method === 'PUT' ? response('A slot with an existing booking cannot be modified or disabled.', 400) : response(original)))
  await store.dispatch(fetchProviderWeeklySchedule('PRV-1'))
  const action = await store.dispatch(saveWeeklySchedule({ providerId: 'PRV-1', weeklySchedule: { monday: [] } }))
  assert.equal(action.type, 'availability/saveWeeklySchedule/rejected')
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-1')(state(store)), 'failed')
  assert.equal(selectSaveWeeklyScheduleMutationError('PRV-1')(state(store)), 'A slot with an existing booking cannot be modified or disabled.')
  assert.deepEqual(selectProviderWeeklySchedule('PRV-1')(state(store)), original)
})

test('a schedule fetch that started before a save cannot overwrite the saved schedule', async () => {
  const fetchGate = deferred()
  const saved = weekly('PRV-1', ['13:00-14:00'])
  const { store } = storeWithFetch(async ({ method }) => {
    if (method === 'PUT') return response(saved)
    await fetchGate.promise
    return response(weekly('PRV-1', ['09:00-10:00']))
  })
  // A slow fetch starts, a save starts and finishes, then the pre-save fetch response lands.
  const slowFetch = store.dispatch(fetchProviderWeeklySchedule('PRV-1'))
  await store.dispatch(saveWeeklySchedule({ providerId: 'PRV-1', weeklySchedule: saved.weeklySchedule }))
  fetchGate.resolve(); await slowFetch
  assert.deepEqual(selectProviderWeeklySchedule('PRV-1')(state(store)), saved)
  assert.equal(selectProviderWeeklyScheduleFetchStatus('PRV-1')(state(store)), 'succeeded')
})

test('date override fetch, save, and delete keep the cached list consistent with server responses', async () => {
  const existing = { date: '2026-11-20', fullDayOff: true, disabledSlots: [], enabledSlots: [] }
  const added = { date: '2026-11-21', fullDayOff: false, disabledSlots: ['09:00-10:00'], enabledSlots: [] }
  const { store, calls } = storeWithFetch(({ method, path }) => {
    if (method === 'PUT') return response(added)
    if (method === 'DELETE') return path.endsWith('2026-11-20') ? response(existing) : response('Date override for "2026-11-22" was not found.', 404)
    return response([existing])
  })
  await store.dispatch(fetchProviderDateOverrides('PRV-1'))
  assert.equal(selectProviderDateOverridesFetchStatus('PRV-1')(state(store)), 'succeeded')
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [existing])

  await store.dispatch(saveProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-21', override: { fullDayOff: false, disabledSlots: ['09:00-10:00'], enabledSlots: [] } }))
  assert.deepEqual(calls[1], { path: '/availability/providers/PRV-1/date-overrides/2026-11-21', method: 'PUT', body: { fullDayOff: false, disabledSlots: ['09:00-10:00'], enabledSlots: [] } })
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [existing, added])
  assert.equal(selectSaveDateOverrideMutationStatus('PRV-1', '2026-11-21')(state(store)), 'succeeded')

  await store.dispatch(deleteProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-20' }))
  assert.deepEqual(calls[2], { path: '/availability/providers/PRV-1/date-overrides/2026-11-20', method: 'DELETE', body: undefined })
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [added])
  assert.equal(selectDeleteDateOverrideMutationStatus('PRV-1', '2026-11-20')(state(store)), 'succeeded')

  const missing = await store.dispatch(deleteProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-22' }))
  assert.equal(missing.type, 'availability/deleteProviderDateOverride/rejected')
  assert.equal(selectDeleteDateOverrideMutationError('PRV-1', '2026-11-22')(state(store)), 'Date override for "2026-11-22" was not found.')
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [added])
  assert.equal(calls.length, 4, 'complete mutation responses are applied without a refetch')
})

test('saving an override for an existing date replaces it rather than duplicating it', async () => {
  const before = { date: '2026-11-20', fullDayOff: true, disabledSlots: [], enabledSlots: [] }
  const after = { date: '2026-11-20', fullDayOff: false, disabledSlots: ['09:00-10:00'], enabledSlots: [] }
  const { store } = storeWithFetch(({ method }) => response(method === 'PUT' ? after : [before]))
  await store.dispatch(fetchProviderDateOverrides('PRV-1'))
  await store.dispatch(saveProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-20', override: after }))
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [after])
})

test('an override mutation never invents an override list that was not fetched', async () => {
  const { store } = storeWithFetch(() => response({ date: '2026-11-20', fullDayOff: true, disabledSlots: [], enabledSlots: [] }))
  await store.dispatch(saveProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-20', override: { fullDayOff: true } }))
  assert.equal(selectProviderDateOverrides('PRV-1')(state(store)), null)
  assert.equal(selectSaveDateOverrideMutationStatus('PRV-1', '2026-11-20')(state(store)), 'succeeded')
})

test('mutation states are independent per provider and per date, and never touch fetch state', async () => {
  const gates = {}
  const gate = (key) => { gates[key] ||= deferred(); return gates[key] }
  const { store } = storeWithFetch(async ({ method, path, body }) => {
    if (method === 'GET') return response([])
    await gate(`${method} ${path}`).promise
    if (path.includes('PRV-B')) return response('Date override slots must exist in the provider weekly schedule for that date.', 400)
    return method === 'PUT' && path.endsWith('weekly-schedule') ? response(weekly('PRV-A', body.weeklySchedule.monday)) : response({ date: path.split('/').pop(), fullDayOff: true, disabledSlots: [], enabledSlots: [] })
  })
  await store.dispatch(fetchProviderDateOverrides('PRV-A'))
  await store.dispatch(fetchProviderDateOverrides('PRV-B'))

  const saveA20 = store.dispatch(saveProviderDateOverride({ providerId: 'PRV-A', date: '2026-11-20', override: { fullDayOff: true } }))
  const saveA21 = store.dispatch(saveProviderDateOverride({ providerId: 'PRV-A', date: '2026-11-21', override: { fullDayOff: true } }))
  const saveB20 = store.dispatch(saveProviderDateOverride({ providerId: 'PRV-B', date: '2026-11-20', override: { fullDayOff: true } }))
  const weeklyA = store.dispatch(saveWeeklySchedule({ providerId: 'PRV-A', weeklySchedule: { monday: ['09:00-10:00'] } }))
  for (const [providerId, date] of [['PRV-A', '2026-11-20'], ['PRV-A', '2026-11-21'], ['PRV-B', '2026-11-20']]) {
    assert.equal(selectSaveDateOverrideMutationStatus(providerId, date)(state(store)), 'loading')
  }
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-A')(state(store)), 'loading')
  assert.equal(selectDeleteDateOverrideMutationStatus('PRV-A', '2026-11-20')(state(store)), 'idle')

  gates['PUT /availability/providers/PRV-B/date-overrides/2026-11-20'].resolve(); await saveB20
  assert.equal(selectSaveDateOverrideMutationStatus('PRV-B', '2026-11-20')(state(store)), 'failed')
  assert.equal(selectSaveDateOverrideMutationError('PRV-B', '2026-11-20')(state(store)), 'Date override slots must exist in the provider weekly schedule for that date.')
  assert.equal(selectSaveDateOverrideMutationStatus('PRV-A', '2026-11-20')(state(store)), 'loading')
  assert.equal(selectSaveDateOverrideMutationError('PRV-A', '2026-11-20')(state(store)), null)

  gates['PUT /availability/providers/PRV-A/date-overrides/2026-11-21'].resolve(); await saveA21
  gates['PUT /availability/providers/PRV-A/date-overrides/2026-11-20'].resolve(); await saveA20
  gates['PUT /availability/providers/PRV-A/weekly-schedule'].resolve(); await weeklyA
  assert.deepEqual(selectProviderDateOverrides('PRV-A')(state(store)).map((item) => item.date), ['2026-11-21', '2026-11-20'])
  assert.deepEqual(selectProviderDateOverrides('PRV-B')(state(store)), [])
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-A')(state(store)), 'succeeded')
  assert.equal(selectSaveWeeklyScheduleMutationStatus('PRV-B')(state(store)), 'idle')
  assert.equal(selectProviderDateOverridesFetchStatus('PRV-A')(state(store)), 'succeeded')
  assert.equal(state(store).availability.fetchStatus.weeklyScheduleByProviderId['PRV-A'], undefined)
})

test('a slow save and a later delete of the same date apply in the order they were started', async () => {
  const saveGate = deferred()
  const existing = { date: '2026-11-20', fullDayOff: true, disabledSlots: [], enabledSlots: [] }
  const { store } = storeWithFetch(async ({ method }) => {
    if (method === 'GET') return response([existing])
    if (method === 'PUT') { await saveGate.promise; return response(existing) }
    return response(existing)
  })
  await store.dispatch(fetchProviderDateOverrides('PRV-1'))
  const save = store.dispatch(saveProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-20', override: existing }))
  await store.dispatch(deleteProviderDateOverride({ providerId: 'PRV-1', date: '2026-11-20' }))
  saveGate.resolve(); await save
  assert.deepEqual(selectProviderDateOverrides('PRV-1')(state(store)), [], 'the older save response does not resurrect the deleted override')
})

test('the initial state shape is preserved and serializable', () => {
  const store = configureStore({ reducer: { availability } })
  const current = state(store).availability
  for (const key of Object.keys(initialAvailabilityState)) assert.ok(Object.hasOwn(current, key), key)
  assert.deepEqual(current.mutationStatus, { saveWeeklyScheduleByProviderId: {}, saveDateOverrideByKey: {}, deleteDateOverrideByKey: {} })
  assert.deepEqual(JSON.parse(JSON.stringify(current)), current)
})

// Components read server data from the store. Server rendering does not run layout effects, so
// these renders show exactly what a preloaded cache provides without issuing requests.
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { MemoryRouter } = await import('react-router-dom')
const { Provider } = await import('react-redux')
const { RescheduleModal } = await import('../src/features/customer/bookings/RescheduleModal.jsx')
const { ProviderAvailabilityPanel } = await import('../src/features/provider/availability/ProviderAvailabilityPanel.jsx')

function preloaded(patch) {
  const base = structuredClone(initialAvailabilityState)
  patch(base)
  return configureStore({ reducer: { availability }, preloadedState: { availability: base } })
}
const renderWith = (store, element) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Provider, { store }, element)))

test('the reschedule modal offers only dates with open slots from the cached provider availability', () => {
  const store = preloaded((draft) => {
    draft.availabilityByProviderId['PRV-1'] = generated('PRV-1', [{ date: '2026-11-16', slots: ['09:00-10:00'] }, { date: '2026-11-17', slots: [] }])
    draft.fetchStatus.availabilityByProviderId['PRV-1'] = 'succeeded'
  })
  const booking = { id: 'BOOK-1', providerId: 'PRV-1', service: 'AC Repair', provider: 'CoolFix', date: '2026-10-20', time: '09:00-12:00', status: 'Pending' }
  const markup = renderWith(store, createElement(RescheduleModal, { booking, onClose: () => {}, onRescheduled: () => {} }))
  assert.equal((markup.match(/reschedule-chip/g) || []).length, 1)
  assert.doesNotMatch(markup, /Finding available appointments/)

  const failed = preloaded((draft) => {
    draft.fetchStatus.availabilityByProviderId['PRV-1'] = 'failed'
    draft.fetchError.availabilityByProviderId['PRV-1'] = 'Backend unavailable'
  })
  assert.match(renderWith(failed, createElement(RescheduleModal, { booking, onClose: () => {}, onRescheduled: () => {} })), /Backend unavailable[\s\S]*Retry/)
})

test('the provider panel shows a skeleton until both resources load, then the cached schedule', () => {
  const loading = preloaded((draft) => { draft.fetchStatus.weeklyScheduleByProviderId['PRV-1'] = 'succeeded' })
  assert.match(renderWith(loading, createElement(ProviderAvailabilityPanel, { providerId: 'PRV-1' })), /Loading availability settings/)

  const ready = preloaded((draft) => {
    draft.weeklyScheduleByProviderId['PRV-1'] = weekly('PRV-1', ['09:00-12:00'])
    draft.dateOverridesByProviderId['PRV-1'] = []
    draft.fetchStatus.weeklyScheduleByProviderId['PRV-1'] = 'succeeded'
    draft.fetchStatus.dateOverridesByProviderId['PRV-1'] = 'succeeded'
  })
  const markup = renderWith(ready, createElement(ProviderAvailabilityPanel, { providerId: 'PRV-1' }))
  assert.match(markup, /value="09:00"/)
  assert.match(markup, /value="12:00"/)
  assert.match(markup, /Save Changes/)

  const failed = preloaded((draft) => {
    draft.fetchStatus.weeklyScheduleByProviderId['PRV-1'] = 'failed'
    draft.fetchError.weeklyScheduleByProviderId['PRV-1'] = 'You can manage only your own availability.'
    draft.fetchStatus.dateOverridesByProviderId['PRV-1'] = 'succeeded'
  })
  assert.match(renderWith(failed, createElement(ProviderAvailabilityPanel, { providerId: 'PRV-1' })), /role="alert">You can manage only your own availability\./)
})
