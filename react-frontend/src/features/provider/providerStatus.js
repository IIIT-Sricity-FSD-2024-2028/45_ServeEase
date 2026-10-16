// provider.js statusClass: only a handful of statuses have their own colour; everything else
// (including Cancelled, In Progress and Resolved) falls back to the pending pill in the original.
export function providerStatusPill(status) {
  const value = String(status || '').toLowerCase()
  if (['active', 'accepted', 'completed', 'paid'].includes(value)) return 'status-accepted'
  if (value === 'partially paid') return 'status-partially-paid'
  if (['inactive', 'rejected', 'failed'].includes(value)) return 'status-cancelled'
  return 'status-pending'
}
