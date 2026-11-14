import { homeFallbackCatalog } from './homeFallbackCatalog.js'

const hasCategories = (catalog) => Array.isArray(catalog?.categories) && catalog.categories.length > 0

export function resolveHomeCatalog({ status, response, local, initialCatalog, initialHasProviderData }) {
  if (status === 'succeeded' && hasCategories(response)) {
    return { catalog: response, hasProviderData: Array.isArray(response.providers) }
  }
  if (status === 'failed' || status === 'succeeded') {
    if (hasCategories(local)) return { catalog: local, hasProviderData: Array.isArray(local.providers) }
  }
  return { catalog: initialCatalog || { ...homeFallbackCatalog, providers: [] }, hasProviderData: initialHasProviderData }
}

export function initialHomeCatalog(local) {
  return hasCategories(local) ? { catalog: local, hasProviderData: Array.isArray(local.providers) }
    : { catalog: { ...homeFallbackCatalog, providers: [] }, hasProviderData: Array.isArray(local?.providers) }
}
