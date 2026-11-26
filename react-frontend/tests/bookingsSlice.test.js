import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { configureStore } from '@reduxjs/toolkit'

const extensionlessImportLoader = `
  export async function resolve(specifier, context, nextResolve) {
    try { return await nextResolve(specifier, context) }
    catch (error) {
      if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.match(/\\.[^/]+$/)) return nextResolve(specifier + '.js', context)
      throw error
    }
  }
`
register(`data:text/javascript,${encodeURIComponent(extensionlessImportLoader)}`, pathToFileURL('./'))

const {
  cancelBooking,
  createCustomerBooking,
  default: bookings,
  fetchBookingDetail,
  fetchCustomerBookings,
  fetchProviderBookings,
  initialBookingsState,
  rescheduleBooking,
  selectBookingById,
  updateProviderBookingStatus,
} = await import('../src/store/slices/bookingsSlice.js')

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function response(data, status = 200) {
  const ok = status >= 200 && status < 300
  return { ok, status, json: async () => ok ? { success: true, data } : { success: false, message: data } }
}

function booking(id, overrides = {}) {
  return {
    id,
    customerId: 'CUS-1',
    service: 'Cleaning',
    provider: 'CleanPro',
    providerId: 'PRO-1',
    date: '2026-11-20',
    time: '10:00 AM - 12:00 PM',
    address: '123 Example Road',
    status: 'Pending',
    category: 'Home Cleaning',
    paymentStatus: 'Paid',
    amount: 918.85,
    customerName: 'Customer One',
    customerPhone: '9000000000',
    customerEmail: 'customer@example.test',
    createdAt: '2026-11-17T10:00:00.000Z',
    stateVersion: 1,
    ...overrides,
  }
}

function storeWithFetch(handler) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    const path = decodeURI(new URL(url).pathname).replace(/^\/api/, '')
    const call = {
      path,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body) : undefined,
    }
    calls.push(call)
    return handler(call)
  }
  return { store: configureStore({ reducer: { bookings } }), calls }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('list normalization preserves returned order, removes duplicate ids, and keeps customer/provider scopes independent', async () => {
  const customerA = booking('BOOK-CUSTOMER-A')
  const customerB = booking('BOOK-CUSTOMER-B', { service: 'Plumbing' })
  const providerA = booking('BOOK-PROVIDER-A', { providerId: 'PRO-2' })
  const { store } = storeWithFetch((call) => call.path === '/bookings/provider'
    ? response([providerA, customerA, providerA])
    : response([customerA, customerB, customerA]))

  await store.dispatch(fetchCustomerBookings())
  await store.dispatch(fetchProviderBookings())

  const state = store.getState().bookings
  assert.deepEqual(state.scopeIds.customer, ['BOOK-CUSTOMER-A', 'BOOK-CUSTOMER-B'])
  assert.deepEqual(state.scopeIds.provider, ['BOOK-PROVIDER-A', 'BOOK-CUSTOMER-A'])
  assert.equal(state.entities['BOOK-CUSTOMER-B'].service, 'Plumbing')
  assert.equal(state.fetchStatus.listByScope.customer, 'succeeded')
  assert.equal(state.fetchStatus.listByScope.provider, 'succeeded')
})

test('detail fetch replaces the complete entity and removes fields omitted by the newer full response', async () => {
  let detail = booking('BOOK-DETAIL', { oldServerField: 'remove-me', stateVersion: 2 })
  const { store } = storeWithFetch((call) => {
    assert.equal(call.path, '/bookings/BOOK-DETAIL')
    return response(detail)
  })

  await store.dispatch(fetchBookingDetail('BOOK-DETAIL'))
  assert.equal(selectBookingById('BOOK-DETAIL')(store.getState()).oldServerField, 'remove-me')

  detail = booking('BOOK-DETAIL', { stateVersion: 3 })
  await store.dispatch(fetchBookingDetail('BOOK-DETAIL'))

  const stored = selectBookingById('BOOK-DETAIL')(store.getState())
  assert.equal(stored.stateVersion, 3)
  assert.equal(stored.oldServerField, undefined)
  assert.equal(store.getState().bookings.fetchStatus.detailById['BOOK-DETAIL'], 'succeeded')
})

test('create uses a request key, stores the full response, and completes its keyed lifecycle', async () => {
  const created = booking('BOOK-CREATED', { status: 'Pending', stateVersion: 1 })
  const { store, calls } = storeWithFetch((call) => {
    assert.equal(call.path, '/bookings/customer')
    assert.equal(call.method, 'POST')
    assert.equal(call.body.paymentMethod, undefined)
    return response(created)
  })

  const pending = store.dispatch(createCustomerBooking({
    requestKey: 'create-request-1',
    booking: { service: 'Cleaning', providerId: 'PRO-1', date: '2026-11-20', time: '10:00 AM - 12:00 PM', address: '123 Example Road' },
  }))
  assert.equal(store.getState().bookings.mutationStatus.createCustomerBookingByRequestKey['create-request-1'], 'loading')
  const action = await pending

  assert.equal(action.type, 'bookings/createCustomerBooking/fulfilled')
  assert.equal(store.getState().bookings.mutationStatus.createCustomerBookingByRequestKey['create-request-1'], 'succeeded')
  assert.equal(store.getState().bookings.entities['BOOK-CREATED'].createdAt, created.createdAt)
  assert.deepEqual(store.getState().bookings.scopeIds.customer, ['BOOK-CREATED'])
  assert.equal(calls.length, 1)
})

test('cancel, reschedule, and provider status preserve preflight/version/reason behavior and use independent keyed lifecycles', async () => {
  const currentCancel = booking('BOOK-CANCEL', { stateVersion: 5 })
  const cancelled = booking('BOOK-CANCEL', { status: 'Cancelled', stateVersion: 6, cancellationActor: 'Customer' })
  const currentReschedule = booking('BOOK-RESCHEDULE', { stateVersion: 7 })
  const rescheduled = booking('BOOK-RESCHEDULE', { date: '2026-11-21', time: '02:00 PM - 04:00 PM', stateVersion: 8, rescheduleCount: 1 })
  const rejected = booking('BOOK-PROVIDER', { status: 'Rejected', stateVersion: 9, rejectionReason: 'Unavailable at that time.' })

  const { store, calls } = storeWithFetch((call) => {
    if (call.method === 'GET' && call.path === '/bookings/BOOK-CANCEL') return response(currentCancel)
    if (call.method === 'PATCH' && call.path === '/bookings/BOOK-CANCEL') return response(cancelled)
    if (call.method === 'GET' && call.path === '/bookings/BOOK-RESCHEDULE') return response(currentReschedule)
    if (call.method === 'PATCH' && call.path === '/bookings/BOOK-RESCHEDULE/reschedule') return response(rescheduled)
    if (call.method === 'PATCH' && call.path === '/bookings/BOOK-PROVIDER/provider-status') return response(rejected)
    throw new Error(`Unexpected request: ${call.method} ${call.path}`)
  })

  const cancel = store.dispatch(cancelBooking({ bookingId: 'BOOK-CANCEL' }))
  assert.equal(store.getState().bookings.mutationStatus.cancelById['BOOK-CANCEL'], 'loading')
  await cancel
  const reschedule = store.dispatch(rescheduleBooking({ bookingId: 'BOOK-RESCHEDULE', date: '2026-11-21', time: '02:00 PM - 04:00 PM' }))
  assert.equal(store.getState().bookings.mutationStatus.rescheduleById['BOOK-RESCHEDULE'], 'loading')
  await reschedule
  await store.dispatch(updateProviderBookingStatus({
    bookingId: 'BOOK-PROVIDER',
    status: 'Rejected',
    stateVersion: 8,
    rejectionReason: 'Unavailable at that time.',
  }))

  const cancelPatch = calls.find((call) => call.path === '/bookings/BOOK-CANCEL' && call.method === 'PATCH')
  const reschedulePatch = calls.find((call) => call.path === '/bookings/BOOK-RESCHEDULE/reschedule')
  const providerPatch = calls.find((call) => call.path === '/bookings/BOOK-PROVIDER/provider-status')
  assert.deepEqual(cancelPatch.body, { status: 'Cancelled' })
  assert.deepEqual(reschedulePatch.body, { date: '2026-11-21', time: '02:00 PM - 04:00 PM', stateVersion: 7 })
  assert.deepEqual(providerPatch.body, { status: 'Rejected', stateVersion: 8, rejectionReason: 'Unavailable at that time.' })

  const state = store.getState().bookings
  assert.equal(state.mutationStatus.cancelById['BOOK-CANCEL'], 'succeeded')
  assert.equal(state.mutationStatus.rescheduleById['BOOK-RESCHEDULE'], 'succeeded')
  assert.equal(state.mutationStatus.providerStatusById['BOOK-PROVIDER'], 'succeeded')
  assert.equal(state.entities['BOOK-RESCHEDULE'].stateVersion, 8)
  assert.equal(state.entities['BOOK-PROVIDER'].rejectionReason, 'Unavailable at that time.')
  assert.deepEqual(state.scopeIds.customer, ['BOOK-CANCEL', 'BOOK-RESCHEDULE'])
  assert.deepEqual(state.scopeIds.provider, ['BOOK-PROVIDER'])
})

test('an incomplete mutation response refetches the full record through the detail thunk', async () => {
  const preflight = booking('BOOK-REFETCH', { stateVersion: 3 })
  const refetched = booking('BOOK-REFETCH', {
    service: 'Refetched Cleaning',
    status: 'Cancelled',
    stateVersion: 4,
    amount: 1000,
    customerEmail: 'refetched@example.test',
  })
  const { store, calls } = storeWithFetch((call) => {
    if (call.method === 'GET') return response(calls.filter((item) => item.method === 'GET').length === 1 ? preflight : refetched)
    if (call.method === 'PATCH') return response({ id: 'BOOK-REFETCH', status: 'Cancelled' })
    throw new Error(`Unexpected request: ${call.method} ${call.path}`)
  })

  await store.dispatch(cancelBooking({ bookingId: 'BOOK-REFETCH' }))

  assert.deepEqual(calls.map(({ method, path }) => `${method} ${path}`), [
    'GET /bookings/BOOK-REFETCH',
    'PATCH /bookings/BOOK-REFETCH',
    'GET /bookings/BOOK-REFETCH',
  ])
  const stored = store.getState().bookings.entities['BOOK-REFETCH']
  assert.equal(stored.service, refetched.service)
  assert.equal(stored.amount, refetched.amount)
  assert.equal(stored.customerEmail, refetched.customerEmail)
  assert.equal(stored.stateVersion, refetched.stateVersion)
  assert.equal(stored.status, refetched.status)
  assert.equal(store.getState().bookings.mutationStatus.cancelById['BOOK-REFETCH'], 'succeeded')
})

test('an incomplete detail response retries once and then fails without looping', async () => {
  let detailCalls = 0
  const { store } = storeWithFetch((call) => {
    if (call.method !== 'GET') throw new Error(`Unexpected request: ${call.method} ${call.path}`)
    detailCalls += 1
    return response({ id: 'BOOK-INCOMPLETE', status: 'Pending' })
  })

  const action = await store.dispatch(fetchBookingDetail('BOOK-INCOMPLETE'))

  assert.equal(detailCalls, 2)
  assert.equal(action.type, 'bookings/fetchBookingDetail/rejected')
  assert.equal(action.payload, 'The booking detail response was incomplete after one retry.')
  assert.equal(store.getState().bookings.fetchStatus.detailById['BOOK-INCOMPLETE'], 'failed')
  assert.equal(store.getState().bookings.fetchError.detailById['BOOK-INCOMPLETE'], 'The booking detail response was incomplete after one retry.')
})

test('a rejected request records a serializable failed error without disturbing successful state', async () => {
  const { store } = storeWithFetch(() => response('Bookings backend unavailable.', 503))
  const action = await store.dispatch(fetchCustomerBookings())
  const state = store.getState().bookings

  assert.equal(action.type, 'bookings/fetchCustomerBookings/rejected')
  assert.equal(state.fetchStatus.listByScope.customer, 'failed')
  assert.equal(state.fetchError.listByScope.customer, 'Bookings backend unavailable.')
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state)
  assert.equal(action.payload, 'Bookings backend unavailable.')
  assert.doesNotThrow(() => JSON.stringify(action))
})

test('concurrent provider mutations on different booking ids remain independent', async () => {
  const first = deferred()
  const second = deferred()
  const { store } = storeWithFetch((call) => {
    if (call.path.endsWith('/BOOK-A/provider-status')) return first.promise
    if (call.path.endsWith('/BOOK-B/provider-status')) return second.promise
    throw new Error(`Unexpected request: ${call.method} ${call.path}`)
  })

  const a = store.dispatch(updateProviderBookingStatus({ bookingId: 'BOOK-A', status: 'Accepted', stateVersion: 1 }))
  const b = store.dispatch(updateProviderBookingStatus({ bookingId: 'BOOK-B', status: 'Accepted', stateVersion: 1 }))
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-A'], 'loading')
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-B'], 'loading')

  second.resolve(response(booking('BOOK-B', { status: 'Accepted', stateVersion: 2 })))
  await b
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-A'], 'loading')
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-B'], 'succeeded')

  first.resolve(response(booking('BOOK-A', { status: 'Accepted', stateVersion: 2 })))
  await a
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-A'], 'succeeded')
  assert.equal(store.getState().bookings.entities['BOOK-A'].status, 'Accepted')
  assert.equal(store.getState().bookings.entities['BOOK-B'].status, 'Accepted')
})

test('provider status mutation records loading by booking id before the response settles', async () => {
  const gate = deferred()
  const { store } = storeWithFetch(() => gate.promise)
  const pending = store.dispatch(updateProviderBookingStatus({ bookingId: 'BOOK-PENDING', status: 'Accepted', stateVersion: 1 }))

  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-PENDING'], 'loading')
  gate.resolve(response(booking('BOOK-PENDING', { status: 'Accepted', stateVersion: 2 })))
  await pending
  assert.equal(store.getState().bookings.mutationStatus.providerStatusById['BOOK-PENDING'], 'succeeded')
})

test('initial state keeps fetch and mutation branches separate', () => {
  assert.equal(initialBookingsState.fetchStatus.listByScope.customer, 'idle')
  assert.equal(initialBookingsState.mutationStatus.cancelById.BOOK, undefined)
  assert.equal(initialBookingsState.latestRequestId.providerStatusById.BOOK, undefined)
})

