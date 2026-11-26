export function show(value) {
  if (value === null || value === undefined) return 'Not available'
  if (typeof value === 'string' && value.trim() === '') return 'Not available'
  return value
}

export function money(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Not available'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
}
