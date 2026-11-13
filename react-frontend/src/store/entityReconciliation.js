// Redux stores only server records. These helpers make partial mutation handling explicit
// without assuming nested response schemas that the current API does not guarantee.
export function nonEmptyKey(value) {
  const key = String(value ?? '').trim()
  return key || null
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Use when a server response is known to contain only changed top-level fields. Omitted fields
// are retained, undefined never overwrites a cached value, and an explicit null is preserved.
export function mergePartialRecord(existing, partial) {
  if (!isRecord(partial)) return existing ?? partial
  const current = isRecord(existing) ? existing : {}
  return Object.entries(partial).reduce((next, [key, value]) => {
    if (value !== undefined) next[key] = value
    return next
  }, { ...current })
}

// Use only when the endpoint is documented or verified to return a complete server record.
// A shallow copy keeps reducer callers from retaining a mutable response object.
export function replaceFullRecord(record) {
  return isRecord(record) ? { ...record } : record
}
