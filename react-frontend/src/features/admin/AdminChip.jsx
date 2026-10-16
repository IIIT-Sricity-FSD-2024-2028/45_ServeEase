// superuser.js chipClass(): the status text, lower-cased and hyphenated, picks the .superuser-chip colour.
function chipClass(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'in progress' ? 'in-progress' : normalized.replace(/\s+/g, '-')
}

export function AdminChip({ children, tone }) {
  return <span className={`admin-chip admin-chip--${tone || chipClass(children)}`}>{children}</span>
}
