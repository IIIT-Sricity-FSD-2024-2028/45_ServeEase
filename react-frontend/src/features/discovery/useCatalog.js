import { useCallback, useLayoutEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import { fetchCatalog, selectCatalog, selectCatalogFetchError, selectCatalogFetchStatus } from '../../store/catalog/catalogSlice.js'
import { normalizeCatalog } from './catalogModel.js'

// Loads the shared GET /catalog cache on every mount. Consumers retain the original hook contract.
export function useCatalog() {
  const dispatch = useAppDispatch()
  const catalog = useAppSelector(selectCatalog)
  const status = useAppSelector(selectCatalogFetchStatus)
  const fetchError = useAppSelector(selectCatalogFetchError)
  useLayoutEffect(() => { dispatch(fetchCatalog()) }, [dispatch])
  const data = useMemo(() => status === 'succeeded' && catalog ? normalizeCatalog(catalog) : null, [catalog, status])
  const reload = useCallback(() => { dispatch(fetchCatalog()) }, [dispatch])
  return { loading: status === 'idle' || status === 'loading', data, error: status === 'failed' ? fetchError || '' : '', reload }
}
