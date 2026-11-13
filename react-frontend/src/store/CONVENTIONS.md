# ServeEase Redux conventions

These conventions apply when feature work begins. They preserve the existing API wrappers and
avoid a second cache for resources shared by role-specific pages.

## Thunks

- Name async thunks with an operation verb followed by a resource: `fetchCatalog`,
  `fetchProviderById`, `fetchCustomerBookings`, `createCustomerTicket`, and
  `saveWeeklySchedule`.
- A thunk calls an existing method from `src/services/api.js` or the feature's existing API
  wrapper. It must not recreate endpoint URLs or modify the API client.
- Mutations use the server-confirmed response to update the relevant cache, or explicitly
  refetch that resource when the existing response does not contain enough data.

Examples from the current API: `fetchCustomerBookings` calls `bookingsApi.list()`,
`rescheduleBooking` calls `bookingsApi.reschedule(id, payload)`, `fetchProviderAvailability`
calls `availabilityApi.get(providerId)`, and `saveWeeklySchedule` calls
`availabilityApi.saveWeeklySchedule(providerId, weeklySchedule)`.

## Fetch and mutation request state

- Use only `idle`, `loading`, `succeeded`, and `failed` for request status values.
- Every slice has separate `fetchStatus`/`fetchError` and `mutationStatus`/`mutationError`
  branches. A mutation must never reuse or overwrite its resource's fetch state.
- Collections use one fetch status/error. Keyed details use maps keyed by the same canonical
  entity/provider key. Per-record mutations also use keyed maps.
- For example, `bookings.fetchStatus.detailById['BOOK-…']` tracks `bookingsApi.get(id)`, while
  `bookings.mutationStatus.rescheduleById['BOOK-…']` tracks `bookingsApi.reschedule(id, payload)`.
  These may be `loading` simultaneously without collision.
- A create/upload operation without a server entity id yet uses a plain caller-generated request
  key, such as `createCustomerTicketByRequestKey[requestKey]`. The request key must be a string,
  never a `File`, `Blob`, or other non-serializable value.
- Availability uses separate resource maps: `availabilityByProviderId`,
  `weeklyScheduleByProviderId`, and `dateOverridesByProviderId`. A date-override mutation key
  is `dateOverrideRequestKey(providerId, date)`, allowing different providers or dates to save
  independently.
- Do not use a single feature-wide loading or error field for independent concurrent requests.

## Reducers and normalized data

- Name synchronous cache reducers with `set`, `upsert`, `replace`, `remove`, or `clear`.
- A normalized entity map has one canonical record per key. Scope/list collections contain keys,
  not duplicate records.
- Use `replaceFullRecord(record)` only for an endpoint verified to return a complete record.
  `Booking` mutation endpoints return a complete `Booking`, so their entity may be replaced.
- Use `mergePartialRecord(existing, partial)` only for a response known to contain changed
  top-level fields. It preserves omitted fields, ignores `undefined`, and preserves an explicit
  `null`. Do not deep-merge nested objects unless that nested response contract has been verified.
- A reducer/thunk must choose one reconciliation rule explicitly. If response completeness is
  unknown, refetch the canonical resource rather than guessing.
- `bookings` owns all booking data, including data rendered by admin booking pages. `tickets`
  owns all ticket data, including data rendered by admin ticket pages.
- Tickets use `ticketEntityKey(ticket)`: `ticket.ticketId` is canonical; `ticket.id` is accepted
  only for legacy-compatible records already supported by the backend and provider UI.
- Bookings use `bookingEntityKey(booking)`, which is the required backend `Booking.id`.
- Provider identity is intentionally endpoint-specific, not universal: catalog entity caches use
  `catalogProviderEntityKey(provider)` (`CatalogProvider.id`, the listing id); availability
  caches use the exact id sent to `availabilityApi` after the existing
  `availabilityProviderId(provider)` helper resolves `ownerProviderId || id`; employee/admin
  provider-detail caches use `providerOperationEntityKey(providerId, listing)`, because the
  existing endpoint accepts an account id plus an optional listing discriminator for shared ids.

## Selectors and local UI state

- Export selectors as `select<Resource>` or `select<Resource>ById`; selectors accepting an id
  return a selector function. Use `FetchStatus`/`FetchError` or `MutationStatus`/`MutationError`
  suffixes so callers cannot accidentally render a mutation's state as a fetch state.
- Keep route/search parameters, modal visibility, form drafts, files, Blob/object URLs, timers,
  and browser persistence in component state or their existing helpers.
- Do not put session/authentication state in Redux. `AuthContext` and `serveEaseSession` remain
  the source of authentication used by `apiClient.js`.
