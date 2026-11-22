import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'

register('./support/jsx-hooks.mjs', import.meta.url)

const {
  clearEmployeeMutationState,
  default: operations,
  decideEmployeeProviderVerification,
  fetchEmployeeCustomerById,
  fetchEmployeeCustomerNotifications,
  fetchEmployeeCustomers,
  fetchEmployeeProviderById,
  fetchEmployeeProviderNotifications,
  fetchEmployeeProviders,
  providerOperationEntityKey,
  selectEmployeeCustomerDetail,
  selectEmployeeCustomerDetailFetchStatus,
  selectEmployeeMutationError,
  selectEmployeeMutationStatus,
  selectEmployeeProviderDetail,
  setEmployeeCustomerStatus,
  setEmployeeProviderStatus,
} = await import('../src/store/operations/operationsSlice.js')

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function response(data, status = 200) {
  const ok = status >= 200 && status < 300
  return { ok, status, json: async () => ok ? { success: true, data } : { success: false, message: data } }
}

function storeWithFetch(handler) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = new URL(url)
    const call = {
      path: decodeURIComponent(requestUrl.pathname).replace(/^\/api/, ''),
      query: requestUrl.searchParams,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body) : undefined,
    }
    calls.push(call)
    return handler(call)
  }
  return { store: configureStore({ reducer: { operations } }), calls }
}

const customer = (overrides = {}) => ({
  id: 'CUS-1', fullName: 'Customer One', email: 'customer@example.test', status: 'Active',
  ...overrides,
})

const providerDetail = (id, listing, overrides = {}) => ({
  provider: { id, providerCatalogId: listing, fullName: `Provider ${listing}`, accountStatus: 'Active', ...overrides },
  documents: [], services: [], bookings: [], availability: null, tickets: [], history: [],
})

test('employee lists, details, and notifications use the existing API wrappers and keyed Redux state', async () => {
  const { store, calls } = storeWithFetch((call) => {
    if (call.path.endsWith('/customer-operations/customers')) return response({ customers: [customer()], totals: { customers: 1 } })
    if (call.path.endsWith('/customer-operations/notifications')) return response({ customers: [customer()], tickets: [] })
    if (call.path.endsWith('/provider-operations/providers')) return response({ providers: [], totals: { providers: 0 } })
    if (call.path.endsWith('/provider-operations/notifications')) return response({ providers: [], tickets: [] })
    if (call.path.endsWith('/customers/CUS-1')) return response({ customer: customer(), bookings: [], tickets: [] })
    if (call.path.includes('/providers/ACCOUNT-1')) return response(providerDetail('ACCOUNT-1', call.query.get('listing')))
    return response('Unexpected API request.', 404)
  })

  await store.dispatch(fetchEmployeeCustomers()).unwrap()
  await store.dispatch(fetchEmployeeCustomerById('CUS-1')).unwrap()
  await store.dispatch(fetchEmployeeCustomerNotifications()).unwrap()
  await store.dispatch(fetchEmployeeProviders()).unwrap()
  await store.dispatch(fetchEmployeeProviderNotifications()).unwrap()
  await Promise.all([
    store.dispatch(fetchEmployeeProviderById({ providerId: 'ACCOUNT-1', listing: 'listing-A' })).unwrap(),
    store.dispatch(fetchEmployeeProviderById({ providerId: 'ACCOUNT-1', listing: 'listing-B' })).unwrap(),
  ])

  const state = store.getState()
  assert.equal(state.operations.employee.fetchStatus.customerList, 'succeeded')
  assert.equal(selectEmployeeCustomerDetailFetchStatus('CUS-1')(state), 'succeeded')
  assert.equal(selectEmployeeCustomerDetail('CUS-1')(state).customer.fullName, 'Customer One')
  assert.deepEqual(state.operations.employee.customerNotifications.customers, [customer()])
  assert.equal(state.operations.employee.fetchStatus.providerNotifications, 'succeeded')
  assert.equal(selectEmployeeProviderDetail('ACCOUNT-1', 'listing-A')(state).provider.providerCatalogId, 'listing-A')
  assert.equal(selectEmployeeProviderDetail('ACCOUNT-1', 'listing-B')(state).provider.providerCatalogId, 'listing-B')
  assert.notEqual(providerOperationEntityKey('ACCOUNT-1', 'listing-A'), providerOperationEntityKey('ACCOUNT-1', 'listing-B'))
  assert.deepEqual(calls.filter((call) => call.path.includes('/providers/ACCOUNT-1')).map((call) => call.query.get('listing')).sort(), ['listing-A', 'listing-B'])
})

test('customer status mutation tracks its own lifecycle and preserves cached booking/ticket detail', async () => {
  let updated = false
  const bookings = [{ id: 'BOOK-1' }]
  const tickets = [{ ticketId: 'TKT-1' }]
  const { store, calls } = storeWithFetch((call) => {
    if (call.path.endsWith('/customer-operations/customers')) return response({ customers: [customer()], totals: {} })
    if (call.path.endsWith('/customers/CUS-1')) return response({ customer: customer(), bookings, tickets })
    if (call.path.endsWith('/customers/CUS-1/status') && call.method === 'PATCH') {
      updated = true
      return response({ customer: customer({ status: 'Blocked' }), changed: true })
    }
    return response('Unexpected API request.', 404)
  })
  await store.dispatch(fetchEmployeeCustomers()).unwrap()
  await store.dispatch(fetchEmployeeCustomerById('CUS-1')).unwrap()
  const request = store.dispatch(setEmployeeCustomerStatus({
    customerId: 'CUS-1',
    change: { status: 'Blocked', reason: 'Fraud review', remarks: 'Reviewed' },
  }))
  assert.equal(selectEmployeeMutationStatus('setCustomerStatusById', 'CUS-1')(store.getState()), 'loading')
  await request.unwrap()

  const state = store.getState()
  assert.equal(updated, true)
  assert.equal(selectEmployeeMutationStatus('setCustomerStatusById', 'CUS-1')(state), 'succeeded')
  assert.equal(selectEmployeeMutationError('setCustomerStatusById', 'CUS-1')(state), null)
  assert.equal(selectEmployeeCustomerDetail('CUS-1')(state).customer.status, 'Blocked')
  assert.deepEqual(selectEmployeeCustomerDetail('CUS-1')(state).bookings, bookings)
  assert.deepEqual(selectEmployeeCustomerDetail('CUS-1')(state).tickets, tickets)
  assert.equal(state.operations.employee.customerList.customers[0].status, 'Blocked')
  assert.equal(state.operations.employee.fetchStatus.customerDetailsById['CUS-1'], 'succeeded')
  assert.deepEqual(calls.find((call) => call.method === 'PATCH').body, { status: 'Blocked', reason: 'Fraud review', remarks: 'Reviewed' })

  store.dispatch(clearEmployeeMutationState({ operation: 'setCustomerStatusById', key: 'CUS-1' }))
  assert.equal(selectEmployeeMutationStatus('setCustomerStatusById', 'CUS-1')(store.getState()), 'idle')
})

test('provider status and verification mutations reconcile complete keyed details and list summaries', async () => {
  const id = 'ACCOUNT-1'
  const listing = 'listing-A'
  let statusChanged = false
  let verificationDecided = false
  const { store, calls } = storeWithFetch((call) => {
    if (call.path.endsWith('/provider-operations/providers')) return response({ providers: [{
      id, providerCatalogId: listing, sharedId: true, fullName: 'Provider listing-A', accountStatus: 'Active',
    }], totals: { providers: 1 } })
    if (call.path.includes(`/providers/${id}`) && call.method === 'GET') return response(providerDetail(id, listing))
    if (call.path.endsWith('/status') && call.method === 'PATCH') {
      statusChanged = true
      return response({ ...providerDetail(id, listing, { accountStatus: 'Suspended' }), changed: true })
    }
    if (call.path.endsWith('/verification') && call.method === 'PATCH') {
      verificationDecided = true
      return response(providerDetail(id, listing, { accountStatus: 'Active', verificationStatus: 'Verified' }))
    }
    return response('Unexpected API request.', 404)
  })

  await store.dispatch(fetchEmployeeProviders()).unwrap()
  await store.dispatch(fetchEmployeeProviderById({ providerId: id, listing })).unwrap()
  await store.dispatch(setEmployeeProviderStatus({
    providerId: id, listing,
    change: { status: 'Suspended', reason: 'Repeated no-shows' },
  })).unwrap()
  assert.equal(selectEmployeeMutationStatus('setProviderStatusByKey', providerOperationEntityKey(id, listing))(store.getState()), 'succeeded')
  assert.equal(selectEmployeeProviderDetail(id, listing)(store.getState()).provider.accountStatus, 'Suspended')
  assert.equal(selectEmployeeProviderDetail(id, listing)(store.getState()).changed, undefined)
  assert.equal(store.getState().operations.employee.providerList.providers[0].accountStatus, 'Suspended')

  await store.dispatch(decideEmployeeProviderVerification({
    providerId: id, listing,
    decision: { decision: 'approve', remarks: 'Documents checked' },
  })).unwrap()
  assert.equal(statusChanged, true)
  assert.equal(verificationDecided, true)
  assert.equal(selectEmployeeMutationStatus('decideProviderVerificationByKey', providerOperationEntityKey(id, listing))(store.getState()), 'succeeded')
  assert.equal(selectEmployeeProviderDetail(id, listing)(store.getState()).provider.verificationStatus, 'Verified')
  assert.equal(store.getState().operations.employee.providerList.providers[0].accountStatus, 'Active')
  assert.deepEqual(calls.filter((call) => call.method === 'PATCH').map(({ path, query, body }) => ({ path, listing: query.get('listing'), body })), [
    { path: `/employee/provider-operations/providers/${id}/status`, listing, body: { status: 'Suspended', reason: 'Repeated no-shows' } },
    { path: `/employee/provider-operations/providers/${id}/verification`, listing, body: { decision: 'approve', remarks: 'Documents checked' } },
  ])
})

test('failed employee mutations keep cached records and report a keyed error without touching fetch state', async () => {
  const { store } = storeWithFetch((call) => {
    if (call.path.endsWith('/customer-operations/customers')) return response({ customers: [customer()], totals: {} })
    if (call.path.endsWith('/customers/CUS-1/status')) return response('Status change is not allowed.', 409)
    return response('Unexpected API request.', 404)
  })
  await store.dispatch(fetchEmployeeCustomers()).unwrap()
  const action = await store.dispatch(setEmployeeCustomerStatus({
    customerId: 'CUS-1', change: { status: 'Blocked', reason: 'Policy violation' },
  }))
  const state = store.getState()
  assert.equal(action.meta.requestStatus, 'rejected')
  assert.equal(selectEmployeeMutationStatus('setCustomerStatusById', 'CUS-1')(state), 'failed')
  assert.equal(selectEmployeeMutationError('setCustomerStatusById', 'CUS-1')(state), 'Status change is not allowed.')
  assert.equal(state.operations.employee.customerList.customers[0].status, 'Active')
  assert.equal(state.operations.employee.fetchStatus.customerList, 'succeeded')
})
