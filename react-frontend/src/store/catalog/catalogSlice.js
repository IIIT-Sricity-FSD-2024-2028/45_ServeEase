import { createSlice } from '@reduxjs/toolkit'
import { nonEmptyKey } from '../entityReconciliation.js'

// Catalog data is shared by discovery, provider services, signup, and admin category views.
// API response shapes are intentionally left untouched until the catalog feature migration.
// CatalogProvider.id is the listing identity returned by GET /catalog and GET /catalog/providers/:id.
export function catalogProviderEntityKey(provider) {
  return nonEmptyKey(provider?.id)
}

export function providerServiceEntityKey(providerId, serviceId) {
  const providerKey = nonEmptyKey(providerId)
  const serviceKey = nonEmptyKey(serviceId)
  return providerKey && serviceKey ? JSON.stringify([providerKey, serviceKey]) : null
}

export const initialCatalogState = {
  catalog: null,
  providersById: {},
  providerServicesByProviderId: {},
  fetchStatus: {
    catalog: 'idle',
    providerById: {},
    providerServicesByProviderId: {},
  },
  fetchError: {
    catalog: null,
    providerById: {},
    providerServicesByProviderId: {},
  },
  mutationStatus: {
    syncCatalog: 'idle',
    saveCatalogCategories: 'idle',
    createProviderServiceByRequestKey: {},
    updateProviderServiceByKey: {},
  },
  mutationError: {
    syncCatalog: null,
    saveCatalogCategories: null,
    createProviderServiceByRequestKey: {},
    updateProviderServiceByKey: {},
  },
}

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: initialCatalogState,
  reducers: {},
})

export const selectCatalogState = (state) => state.catalog
export const selectCatalog = (state) => state.catalog.catalog
export const selectCatalogProviderById = (providerId) => (state) => state.catalog.providersById[providerId]
export const selectProviderServices = (providerId) => (state) => state.catalog.providerServicesByProviderId[providerId]
export const selectCatalogFetchStatus = (state) => state.catalog.fetchStatus.catalog
export const selectCatalogFetchError = (state) => state.catalog.fetchError.catalog
export const selectCatalogProviderFetchStatus = (providerId) => (state) => state.catalog.fetchStatus.providerById[providerId] || 'idle'
export const selectCatalogProviderFetchError = (providerId) => (state) => state.catalog.fetchError.providerById[providerId] || null
export const selectProviderServicesFetchStatus = (providerId) => (state) => state.catalog.fetchStatus.providerServicesByProviderId[providerId] || 'idle'
export const selectProviderServicesFetchError = (providerId) => (state) => state.catalog.fetchError.providerServicesByProviderId[providerId] || null
export const selectCatalogMutationStatus = (operation) => (state) => state.catalog.mutationStatus[operation]
export const selectCatalogMutationError = (operation) => (state) => state.catalog.mutationError[operation]

export default catalogSlice.reducer
