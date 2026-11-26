export function nonEmptyKey(value) {
  const key = String(value ?? '').trim()
  return key || null
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function mergePartialRecord(existing, partial) {
  if (!isRecord(partial)) return existing ?? partial
  const current = isRecord(existing) ? existing : {}
  return Object.entries(partial).reduce((next, [key, value]) => {
    if (value !== undefined) next[key] = value
    return next
  }, { ...current })
}

export function replaceFullRecord(record) {
  return isRecord(record) ? { ...record } : record
}
