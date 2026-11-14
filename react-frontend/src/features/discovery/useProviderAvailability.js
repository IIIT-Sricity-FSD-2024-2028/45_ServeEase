import { useCallback, useLayoutEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import {
  availabilityProviderKey,
  fetchProviderAvailability,
  selectProviderAvailability,
  selectProviderAvailabilityFetchError,
  selectProviderAvailabilityFetchStatus,
} from '../../store/availability/availabilitySlice.js'

// Customer-bookable availability (GET /availability/providers/:id) from the shared Redux cache.
// Slots change as other customers book, so like useCatalog it refreshes on every mount; a request
// already in flight for the same provider is reused instead of repeated. `providerId` must be the
// id the availability API expects: resolve catalog listings with availabilityProviderId first.
// A missing id is reported as an error, never as "no appointments"; callers that are still
// resolving the provider (CheckoutPage) treat their own loading state as taking precedence.
export function useProviderAvailability(providerId) {
  const providerKey = availabilityProviderKey(providerId)
  const dispatch = useAppDispatch()
  const availability = useAppSelector(selectProviderAvailability(providerKey))
  const status = useAppSelector(selectProviderAvailabilityFetchStatus(providerKey))
  const fetchError = useAppSelector(selectProviderAvailabilityFetchError(providerKey))
  useLayoutEffect(() => { if (providerKey) dispatch(fetchProviderAvailability(providerKey)) }, [dispatch, providerKey])
  const reload = useCallback(() => { if (providerKey) dispatch(fetchProviderAvailability(providerKey)) }, [dispatch, providerKey])
  const dates = useMemo(() => (status === 'succeeded' && Array.isArray(availability?.dates) ? availability.dates : []), [availability, status])
  return {
    providerKey,
    loading: Boolean(providerKey) && (status === 'idle' || status === 'loading'),
    dates,
    error: !providerKey ? 'Provider id is required.' : status === 'failed' ? fetchError || 'Unable to load provider availability.' : '',
    reload,
  }
}
