import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { catalogApi } from '../../services/api.js'
import { saveCatalogCategories as apiSaveCatalogCategories, syncCatalog as apiSyncCatalog } from '../../features/admin/adminApi.js'
import { replaceFullRecord } from '../entityReconciliation.js'

// Catalog ids are listing ids. A missing id or duplicate id receives a stable per-response
// positional key so no provider is dropped; its original record (including original id) survives.
export function catalogProviderEntityKey(provider) {
  const id = provider?.id
  return id === null || id === undefined || String(id) === '' ? null : String(id)
}

export function providerServiceEntityKey(providerId, serviceId) {
  return providerId === null || providerId === undefined || serviceId === null || serviceId === undefined
    ? null : JSON.stringify([String(providerId), String(serviceId)])
}

function errorText(error) { return error?.message ?? String(error ?? 'Request failed') }
function unwrapCatalog(value) { return value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value }

export function normalizeCatalogResponse(value) {
  const catalog = unwrapCatalog(value) || {}
  const { providers = [], ...rest } = catalog
  const providersById = {}
  const providerIds = []
  const occurrences = new Map()
  ;(Array.isArray(providers) ? providers : []).forEach((provider, index) => {
    const base = catalogProviderEntityKey(provider)
    const count = base === null ? 0 : (occurrences.get(base) || 0)
    if (base !== null) occurrences.set(base, count + 1)
    const key = base === null ? `__missing:${index}` : count ? `${base}#duplicate:${index}` : base
    providerIds.push(key)
    providersById[key] = provider
  })
  return { catalog: rest, providersById, providerIds }
}

export function assembleCatalog({ catalog, providersById, providerIds }) {
  if (!catalog) return null
  return { ...catalog, providers: (providerIds || []).map((id) => providersById[id]) }
}

const reject = (error, api) => api.rejectWithValue(errorText(error))
export const fetchCatalog = createAsyncThunk('catalog/fetchCatalog', async (_arg, api) => {
  try { return normalizeCatalogResponse(await catalogApi.getCatalog()) } catch (error) { return reject(error, api) }
})
export const fetchProviderById = createAsyncThunk('catalog/fetchProviderById', async (id, api) => {
  try { return { id, provider: await catalogApi.getProvider(id) } } catch (error) { return reject(error, api) }
})
export const fetchProviderServices = createAsyncThunk('catalog/fetchProviderServices', async (providerId, api) => {
  try { return { providerId, services: await catalogApi.getProviderServices(providerId) } } catch (error) { return reject(error, api) }
})
export const createProviderService = createAsyncThunk('catalog/createProviderService', async ({ providerId, service, requestKey }, api) => {
  try { return { providerId, requestKey, service: await catalogApi.createProviderService(providerId, service) } } catch (error) { return reject(error, api) }
})
export const updateProviderService = createAsyncThunk('catalog/updateProviderService', async ({ providerId, serviceId, service }, api) => {
  try { return { providerId, serviceId, service: await catalogApi.updateProviderService(providerId, serviceId, service) } } catch (error) { return reject(error, api) }
})
export const syncCatalog = createAsyncThunk('catalog/syncCatalog', async (catalog, api) => {
  try { return await apiSyncCatalog(catalog) } catch (error) { return reject(error, api) }
})
export const saveCatalogCategories = createAsyncThunk('catalog/saveCatalogCategories', async (categories, api) => {
  try { return await apiSaveCatalogCategories(categories) } catch (error) { return reject(error, api) }
})

export const initialCatalogState = {
  catalog: null, providersById: {}, providerIds: [],
  providerServicesByProviderId: {}, providerServicesByKey: {},
  fetchStatus: { catalog: 'idle', providerById: {}, providerServicesByProviderId: {} },
  fetchError: { catalog: null, providerById: {}, providerServicesByProviderId: {} },
  mutationStatus: { syncCatalog: 'idle', saveCatalogCategories: 'idle', createProviderServiceByRequestKey: {}, updateProviderServiceByKey: {} },
  mutationError: { syncCatalog: null, saveCatalogCategories: null, createProviderServiceByRequestKey: {}, updateProviderServiceByKey: {} },
  latestRequestId: { catalog: null, providerById: {}, providerServicesByProviderId: {}, createProviderServiceByRequestKey: {}, updateProviderServiceByKey: {} },
}

const catalogSlice = createSlice({
  name: 'catalog', initialState: initialCatalogState, reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state, action) => { state.fetchStatus.catalog = 'loading'; state.fetchError.catalog = null; state.latestRequestId.catalog = action.meta.requestId })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        if (state.latestRequestId.catalog !== action.meta.requestId) return
        state.catalog = action.payload.catalog; state.providersById = action.payload.providersById; state.providerIds = action.payload.providerIds
        state.fetchStatus.catalog = 'succeeded'; state.fetchError.catalog = null
      })
      .addCase(fetchCatalog.rejected, (state, action) => { if (state.latestRequestId.catalog !== action.meta.requestId) return; state.fetchStatus.catalog = 'failed'; state.fetchError.catalog = action.payload ?? action.error.message })
      .addCase(fetchProviderById.pending, (state, action) => { const id = action.meta.arg; state.fetchStatus.providerById[id] = 'loading'; state.fetchError.providerById[id] = null; state.latestRequestId.providerById[id] = action.meta.requestId })
      .addCase(fetchProviderById.fulfilled, (state, action) => {
        const { id, provider } = action.payload
        if (state.latestRequestId.providerById[id] !== action.meta.requestId) return
        const key = catalogProviderEntityKey(provider) || String(id)
        state.providersById[key] = provider
        state.fetchStatus.providerById[id] = 'succeeded'; state.fetchError.providerById[id] = null
      })
      .addCase(fetchProviderById.rejected, (state, action) => { const id = action.meta.arg; if (state.latestRequestId.providerById[id] !== action.meta.requestId) return; state.fetchStatus.providerById[id] = 'failed'; state.fetchError.providerById[id] = action.payload ?? action.error.message })
      .addCase(fetchProviderServices.pending, (state, action) => { const id = action.meta.arg; state.fetchStatus.providerServicesByProviderId[id] = 'loading'; state.fetchError.providerServicesByProviderId[id] = null; state.latestRequestId.providerServicesByProviderId[id] = action.meta.requestId })
      .addCase(fetchProviderServices.fulfilled, (state, action) => {
        const { providerId, services } = action.payload
        if (state.latestRequestId.providerServicesByProviderId[providerId] !== action.meta.requestId) return
        const ids = []
        ;(Array.isArray(services) ? services : []).forEach((service, index) => {
          const key = providerServiceEntityKey(providerId, service?.id) || JSON.stringify([String(providerId), `__missing:${index}`])
          state.providerServicesByKey[key] = service; ids.push(key)
        })
        state.providerServicesByProviderId[providerId] = ids
        state.fetchStatus.providerServicesByProviderId[providerId] = 'succeeded'; state.fetchError.providerServicesByProviderId[providerId] = null
      })
      .addCase(fetchProviderServices.rejected, (state, action) => { const id = action.meta.arg; if (state.latestRequestId.providerServicesByProviderId[id] !== action.meta.requestId) return; state.fetchStatus.providerServicesByProviderId[id] = 'failed'; state.fetchError.providerServicesByProviderId[id] = action.payload ?? action.error.message })
      .addCase(createProviderService.pending, (state, action) => { const key = action.meta.arg.requestKey; state.latestRequestId.createProviderServiceByRequestKey[key] = action.meta.requestId; state.mutationStatus.createProviderServiceByRequestKey[key] = 'loading'; state.mutationError.createProviderServiceByRequestKey[key] = null })
      .addCase(createProviderService.fulfilled, (state, action) => {
        const { providerId, requestKey, service } = action.payload
        if (state.latestRequestId.createProviderServiceByRequestKey[requestKey] !== action.meta.requestId) return
        const key = providerServiceEntityKey(providerId, service?.id)
        if (key) state.providerServicesByKey[key] = replaceFullRecord(service)
        if (Object.hasOwn(state.providerServicesByProviderId, providerId) && key) state.providerServicesByProviderId[providerId] = [key, ...state.providerServicesByProviderId[providerId].filter((item) => item !== key)]
        state.mutationStatus.createProviderServiceByRequestKey[requestKey] = 'succeeded'; state.mutationError.createProviderServiceByRequestKey[requestKey] = null
      })
      .addCase(createProviderService.rejected, (state, action) => { const key = action.meta.arg.requestKey; if (state.latestRequestId.createProviderServiceByRequestKey[key] !== action.meta.requestId) return; state.mutationStatus.createProviderServiceByRequestKey[key] = 'failed'; state.mutationError.createProviderServiceByRequestKey[key] = action.payload ?? action.error.message })
      .addCase(updateProviderService.pending, (state, action) => { const { providerId, serviceId } = action.meta.arg; const key = providerServiceEntityKey(providerId, serviceId); state.latestRequestId.updateProviderServiceByKey[key] = action.meta.requestId; state.mutationStatus.updateProviderServiceByKey[key] = 'loading'; state.mutationError.updateProviderServiceByKey[key] = null })
      .addCase(updateProviderService.fulfilled, (state, action) => {
        const { providerId, serviceId, service } = action.payload
        const key = providerServiceEntityKey(providerId, service?.id ?? serviceId)
        const mutationKey = providerServiceEntityKey(providerId, serviceId)
        if (state.latestRequestId.updateProviderServiceByKey[mutationKey] !== action.meta.requestId) return
        if (key) state.providerServicesByKey[key] = replaceFullRecord(service)
        const mapKey = mutationKey
        if (Object.hasOwn(state.providerServicesByProviderId, providerId) && key && !state.providerServicesByProviderId[providerId].includes(key)) state.providerServicesByProviderId[providerId] = state.providerServicesByProviderId[providerId].map((item) => item === mapKey ? key : item)
        state.mutationStatus.updateProviderServiceByKey[mapKey] = 'succeeded'; state.mutationError.updateProviderServiceByKey[mapKey] = null
      })
      .addCase(updateProviderService.rejected, (state, action) => { const { providerId, serviceId } = action.meta.arg; const key = providerServiceEntityKey(providerId, serviceId); if (state.latestRequestId.updateProviderServiceByKey[key] !== action.meta.requestId) return; state.mutationStatus.updateProviderServiceByKey[key] = 'failed'; state.mutationError.updateProviderServiceByKey[key] = action.payload ?? action.error.message })
      .addCase(syncCatalog.pending, (state) => { state.mutationStatus.syncCatalog = 'loading'; state.mutationError.syncCatalog = null })
      .addCase(syncCatalog.fulfilled, (state) => { state.mutationStatus.syncCatalog = 'succeeded'; state.mutationError.syncCatalog = null })
      .addCase(syncCatalog.rejected, (state, action) => { state.mutationStatus.syncCatalog = 'failed'; state.mutationError.syncCatalog = action.payload ?? action.error.message })
      .addCase(saveCatalogCategories.pending, (state) => { state.mutationStatus.saveCatalogCategories = 'loading'; state.mutationError.saveCatalogCategories = null })
      .addCase(saveCatalogCategories.fulfilled, (state) => { state.mutationStatus.saveCatalogCategories = 'succeeded'; state.mutationError.saveCatalogCategories = null })
      .addCase(saveCatalogCategories.rejected, (state, action) => { state.mutationStatus.saveCatalogCategories = 'failed'; state.mutationError.saveCatalogCategories = action.payload ?? action.error.message })
  },
})

export const selectCatalogState = (state) => state.catalog
const selectCatalogPart = (state) => state.catalog.catalog
const selectProvidersById = (state) => state.catalog.providersById
const selectProviderIds = (state) => state.catalog.providerIds
export const selectCatalog = createSelector([selectCatalogPart, selectProvidersById, selectProviderIds], (catalog, providersById, providerIds) => assembleCatalog({ catalog, providersById, providerIds }))
export const selectCatalogProviderById = (providerId) => (state) => state.catalog.providersById[providerId]
export const selectProviderServices = (providerId) => createSelector([(state) => state.catalog.providerServicesByProviderId[providerId], (state) => state.catalog.providerServicesByKey], (ids, entities) => ids?.map((id) => entities[id]) ?? undefined)
export const selectCatalogFetchStatus = (state) => state.catalog.fetchStatus.catalog
export const selectCatalogFetchError = (state) => state.catalog.fetchError.catalog
export const selectCatalogProviderFetchStatus = (id) => (state) => state.catalog.fetchStatus.providerById[id] || 'idle'
export const selectCatalogProviderFetchError = (id) => (state) => state.catalog.fetchError.providerById[id] || null
export const selectProviderServicesFetchStatus = (id) => (state) => state.catalog.fetchStatus.providerServicesByProviderId[id] || 'idle'
export const selectProviderServicesFetchError = (id) => (state) => state.catalog.fetchError.providerServicesByProviderId[id] || null
export const selectCatalogMutationStatus = (operation) => (state) => state.catalog.mutationStatus[operation]
export const selectCatalogMutationError = (operation) => (state) => state.catalog.mutationError[operation]
export const selectCreateProviderServiceMutationStatus = (requestKey) => (state) => state.catalog.mutationStatus.createProviderServiceByRequestKey[requestKey] || 'idle'
export const selectCreateProviderServiceMutationError = (requestKey) => (state) => state.catalog.mutationError.createProviderServiceByRequestKey[requestKey] || null
export const selectUpdateProviderServiceMutationStatus = (providerId, serviceId) => (state) => state.catalog.mutationStatus.updateProviderServiceByKey[providerServiceEntityKey(providerId, serviceId)] || 'idle'
export const selectUpdateProviderServiceMutationError = (providerId, serviceId) => (state) => state.catalog.mutationError.updateProviderServiceByKey[providerServiceEntityKey(providerId, serviceId)] || null
export default catalogSlice.reducer
