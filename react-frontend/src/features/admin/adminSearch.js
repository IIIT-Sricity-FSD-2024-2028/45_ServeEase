import { useEffect, useState } from 'react'

// The superuser-*.html topbar search, per page. The dashboard search routes on Enter (superuser.js
// setupGlobalSearch); every other page filters its own records as the user types.
const placeholders = {
  '/admin': 'Search users, providers, or bookings...',
  '/admin/customers': 'Search customers or providers...',
  '/admin/providers': 'Search customers or providers...',
  '/admin/verification': 'Search provider name, email, or phone...',
  '/admin/categories': 'Search service categories...',
  '/admin/bookings': 'Search bookings by ID, customer, provider, or service...',
  '/admin/escalated-tickets': 'Search tickets by ID, subject, requester, provider, or category...',
  '/admin/administration': 'Search employees...',
}

const SEARCH_EVENT = 'serveease:admin-search'

export function adminSearchPlaceholder(pathname) {
  return placeholders[pathname] || 'Search...'
}

// Returns the route to open for a dashboard Enter, otherwise announces the term to the current page.
export function applyAdminSearch(pathname, value, isEnter = false) {
  if (pathname === '/admin') {
    const term = String(value || '').trim().toLowerCase()
    if (!isEnter || !term) return null
    if (term.includes('ticket')) return '/admin/escalated-tickets'
    if (term.includes('booking')) return '/admin/bookings'
    return '/admin/customers'
  }
  if (!isEnter) window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: { pathname, value: String(value || '') } }))
  return null
}

// superuser.js matchesManagementSearch(): every whitespace-separated word must appear somewhere.
export function matchesAdminSearch(values, term) {
  const parts = String(term || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!parts.length) return true
  const haystack = values.filter((value) => value !== null && value !== undefined).join(' ').toLowerCase()
  return parts.every((part) => haystack.includes(part))
}

// The topbar term for the page at `pathname` (it resets with the topbar input on navigation).
export function useAdminSearch(pathname) {
  const [term, setTerm] = useState('')
  useEffect(() => {
    function onSearch(event) {
      if (event.detail?.pathname === pathname) setTerm(event.detail.value)
    }
    window.addEventListener(SEARCH_EVENT, onSearch)
    return () => window.removeEventListener(SEARCH_EVENT, onSearch)
  }, [pathname])
  return term
}
