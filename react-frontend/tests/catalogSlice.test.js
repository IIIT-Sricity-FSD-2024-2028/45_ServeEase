import test, { afterEach } from 'node:test'
import { register } from 'node:module'
import assert from 'node:assert/strict'
import { configureStore } from '@reduxjs/toolkit'
import catalog, { assembleCatalog, createProviderService, fetchCatalog, fetchProviderById, fetchProviderServices, initialCatalogState, normalizeCatalogResponse, providerServiceEntityKey, saveCatalogCategories, selectCatalog, syncCatalog, updateProviderService } from '../src/store/catalog/catalogSlice.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => status >= 200 && status < 300 ? { success: true, data } : { success: false, message: data } }
}
function storeWithFetch(fetcher) {
  globalThis.fetch = fetcher
  return configureStore({ reducer: { catalog } })
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function fixture() {
  return {
    categories: [{ id: 'cleaning', subServices: ['Kitchen'] }], popularServices: [{ title: 'Home cleaning' }], region: 'IN', generatedAt: '2026-01-01',
    providers: Array.from({ length: 10 }, (_, index) => ({ id: `listing-${index}`, name: `Provider ${index}`, cityId: index + 1, ownerProviderId: index % 2 ? `account-${index}` : undefined, services: index % 2 ? [{ id: `S-${index}`, name: 'Cleaning', price: 1200 }] : undefined, servicePricing: { Cleaning: 1200 }, extra: { verified: true } })),
  }
}

test('catalog normalization assembles losslessly and deliberately preserves missing and duplicate ids', () => {
  const original = fixture()
  assert.deepEqual(assembleCatalog(normalizeCatalogResponse(original)), original)
  const unusual = { categories: [], providers: [{ id: 'same', n: 1 }, { id: 'same', n: 2 }, { n: 3 }] }
  const normalized = normalizeCatalogResponse(unusual)
  assert.deepEqual(assembleCatalog(normalized), unusual)
  assert.equal(normalized.providerIds.length, 3)
  assert.equal(new Set(normalized.providerIds).size, 3)
})

test('fetchCatalog succeeds, preserves exact failures, and serializes Redux state', async () => {
  const catalogData = fixture()
  const store = storeWithFetch(async () => response(catalogData))
  const action = await store.dispatch(fetchCatalog())
  assert.equal(action.type, 'catalog/fetchCatalog/fulfilled')
  assert.deepEqual(selectCatalog(store.getState()), catalogData)
  assert.equal(store.getState().catalog.fetchStatus.catalog, 'succeeded')
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState())), store.getState())

  const failed = storeWithFetch(async () => response('Exact backend catalog error', 500))
  const rejected = await failed.dispatch(fetchCatalog())
  assert.equal(rejected.type, 'catalog/fetchCatalog/rejected')
  assert.equal(failed.getState().catalog.fetchError.catalog, 'Exact backend catalog error')
  assert.equal(failed.getState().catalog.fetchStatus.catalog, 'failed')
})

test('fetchProviderById stores the provider under its listing id', async () => {
  const store = storeWithFetch(async () => response({ id: 'listing-1', name: 'One', ownerProviderId: 'account-1' }))
  const action = await store.dispatch(fetchProviderById('listing-1'))
  assert.equal(action.type, 'catalog/fetchProviderById/fulfilled')
  assert.equal(store.getState().catalog.providersById['listing-1'].ownerProviderId, 'account-1')
  assert.equal(store.getState().catalog.fetchStatus.providerById['listing-1'], 'succeeded')
})

test('provider service requests stay independent and latest request wins for one provider', async () => {
  let releaseA; let releaseB; let releaseOld; let releaseNew
  const store = storeWithFetch((url) => {
    if (url.includes('/providers/A/')) return new Promise((resolve) => { releaseA = resolve })
    if (url.includes('/providers/B/')) return new Promise((resolve) => { releaseB = resolve })
    if (!releaseOld) return new Promise((resolve) => { releaseOld = resolve })
    return new Promise((resolve) => { releaseNew = resolve })
  })
  const a = store.dispatch(fetchProviderServices('A'))
  const b = store.dispatch(fetchProviderServices('B'))
  await tick()
  assert.equal(store.getState().catalog.fetchStatus.providerServicesByProviderId.A, 'loading')
  assert.equal(store.getState().catalog.fetchStatus.providerServicesByProviderId.B, 'loading')
  releaseA(response([{ id: 'a1', name: 'A service' }]))
  await a
  assert.equal(store.getState().catalog.fetchStatus.providerServicesByProviderId.B, 'loading')
  releaseB(response([{ id: 'b1', name: 'B service' }]))
  await b

  const oldRequest = store.dispatch(fetchProviderServices('C'))
  await tick()
  const newRequest = store.dispatch(fetchProviderServices('C'))
  await tick()
  releaseNew(response([{ id: 'new', name: 'new' }]))
  await newRequest
  releaseOld(response([{ id: 'old', name: 'old' }]))
  await oldRequest
  assert.equal(store.getState().catalog.providerServicesByKey[providerServiceEntityKey('C', 'new')].name, 'new')
  assert.equal(store.getState().catalog.providerServicesByProviderId.C.length, 1)
})

test('create prepends a full record and request-key status; updates replace records independently', async () => {
  let method = 'GET'
  let result
  const store = storeWithFetch(async (_url, options = {}) => { method = options.method || 'GET'; return response(result ?? []) })
  await store.dispatch(fetchProviderServices('account-X'))
  result = { id: 'created', name: 'Complete', description: 'all fields', price: 5, backendOnly: 'kept' }
  const create = store.dispatch(createProviderService({ providerId: 'account-X', service: { name: 'Complete' }, requestKey: 'req-1' }))
  assert.equal(store.getState().catalog.mutationStatus.createProviderServiceByRequestKey['req-1'], 'loading')
  await create
  assert.equal(store.getState().catalog.providerServicesByProviderId['account-X'][0], providerServiceEntityKey('account-X', 'created'))
  assert.equal(store.getState().catalog.providerServicesByKey[providerServiceEntityKey('account-X', 'created')].backendOnly, 'kept')
  assert.equal(store.getState().catalog.mutationStatus.createProviderServiceByRequestKey['req-1'], 'succeeded')

  result = { id: 'existing', name: 'Updated full', otherField: 'retained from response' }
  const first = store.dispatch(updateProviderService({ providerId: 'account-X', serviceId: 'existing', service: { isActive: false } }))
  result = { id: 'other', name: 'Other update' }
  const second = store.dispatch(updateProviderService({ providerId: 'account-X', serviceId: 'other', service: { isActive: false } }))
  await Promise.all([first, second])
  assert.equal(store.getState().catalog.mutationStatus.updateProviderServiceByKey[providerServiceEntityKey('account-X', 'existing')], 'succeeded')
  assert.equal(store.getState().catalog.mutationStatus.updateProviderServiceByKey[providerServiceEntityKey('account-X', 'other')], 'succeeded')
  assert.equal(store.getState().catalog.providerServicesByKey[providerServiceEntityKey('account-X', 'existing')].otherField, 'retained from response')
  assert.equal(store.getState().catalog.fetchStatus.providerServicesByProviderId['account-X'], 'succeeded')
  assert.equal(method, 'PATCH')
})

test('sync and category-save mutation lifecycles are independent of catalog fetching; null is success', async () => {
  const actions = []
  const store = configureStore({ reducer: { catalog }, middleware: (getDefault) => getDefault().concat(() => (next) => (action) => { actions.push(action.type); return next(action) }) })
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname
    if (path.endsWith('/catalog/sync')) return response({ categories: [], providers: [], popularServices: [] })
    if (path.endsWith('/state/serveEaseData') && !options.method) return response(null, 404)
    if (path.endsWith('/catalog')) return response(fixture())
    return response(null)
  }
  const beforeFetch = store.getState().catalog.fetchStatus.catalog
  await store.dispatch(syncCatalog({ categories: [], providers: [], popularServices: [] }))
  await store.dispatch(saveCatalogCategories([]))
  assert.equal(store.getState().catalog.mutationStatus.syncCatalog, 'succeeded')
  assert.equal(store.getState().catalog.mutationStatus.saveCatalogCategories, 'succeeded')
  assert.equal(store.getState().catalog.fetchStatus.catalog, beforeFetch)
  assert.equal(store.getState().catalog.catalog, null)
  await store.dispatch(fetchCatalog())
  assert.deepEqual(actions.filter((type) => type?.startsWith('catalog/')).slice(0, 6), [
    'catalog/syncCatalog/pending', 'catalog/syncCatalog/fulfilled', 'catalog/saveCatalogCategories/pending', 'catalog/saveCatalogCategories/fulfilled', 'catalog/fetchCatalog/pending', 'catalog/fetchCatalog/fulfilled',
  ])
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState())), store.getState())
})

test('initial state keeps separate fetch and mutation branches', () => {
  assert.equal(initialCatalogState.fetchStatus.catalog, 'idle')
  assert.equal(initialCatalogState.mutationStatus.syncCatalog, 'idle')
})
