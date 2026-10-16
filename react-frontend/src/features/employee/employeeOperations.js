// Logic for the employee Customer Operations pages (front-end/JavaScript/customer-operations*.js), applied to
// the API responses (Provider Operations logic is in providerOperations.js). Missing values are shown as "N/A" exactly like the original.

export const NOT_AVAILABLE = 'N/A'

export function display(value) {
  return value === undefined || value === null || String(value).trim() === '' ? NOT_AVAILABLE : String(value)
}

export function chipClass(value) {
  return String(value || 'not recorded').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
}

// renderStats(): Customers, Active, Blocked, Bookings, Support Tickets.
export function customerStats(overview) {
  const customers = overview?.customers || []
  return {
    customers: customers.length,
    active: customers.filter((customer) => customer.status === 'Active').length,
    blocked: customers.filter((customer) => customer.status === 'Blocked').length,
    bookings: overview?.totals?.bookings ?? 0,
    tickets: overview?.totals?.customerTickets ?? 0,
  }
}

// filteredCustomers(): status filter ("N/A" = no recorded status) and free-text search.
export function filterCustomers(customers, { status = 'all', query = '' } = {}) {
  const term = query.trim().toLowerCase()
  return customers.filter((customer) => {
    if (status !== 'all' && display(customer.status) !== status) return false
    if (!term) return true
    return [customer.id, customer.fullName, customer.email, customer.phone, customer.location, display(customer.status)]
      .join(' ').toLowerCase().includes(term)
  })
}

const activeBookingStatuses = ['pending', 'requested', 'accepted', 'upcoming']
const openTicketStatuses = ['open', 'pending', 'in progress', 'escalated', 'under review']

// customer-operations-detail.js renderStats()
export function customerDetailStats(bookings, tickets) {
  const status = (value) => String(value || '').toLowerCase()
  return {
    total: bookings.length,
    active: bookings.filter((booking) => activeBookingStatuses.includes(status(booking.status))).length,
    completed: bookings.filter((booking) => status(booking.status) === 'completed').length,
    openTickets: tickets.filter((ticket) => openTicketStatuses.includes(status(ticket.status))).length,
  }
}

// customer-operations-detail.js status action: 'Blocked' customers show Activate, everyone else Suspend.
// A customer without a recorded status is Active; any other recorded status is not managed here.
export function customerStatusAction(customer) {
  const status = String(customer?.status || 'Active').toLowerCase()
  if (status === 'blocked') return { nextStatus: 'Active', verb: 'Activate', label: 'Activate Customer', pending: 'Activating…', tone: 'btn-success' }
  if (status === 'active') return { nextStatus: 'Blocked', verb: 'Suspend', label: 'Suspend Customer', pending: 'Suspending…', tone: 'btn-danger' }
  return null
}

export const initialStatusChange = { phase: 'idle', nextStatus: null, error: '', notice: '' }

// idle → confirming (dialog open) → submitting → idle with a notice, or back to confirming with an error.
export function statusChangeReducer(state, action) {
  switch (action.type) {
    case 'open': return state.phase === 'submitting' ? state : { phase: 'confirming', nextStatus: action.nextStatus, error: '', notice: '' }
    case 'cancel': return state.phase === 'submitting' ? state : { ...state, phase: 'idle', error: '' }
    case 'invalid': return state.phase === 'confirming' ? { ...state, error: action.message } : state
    case 'submit': return state.phase === 'confirming' ? { ...state, phase: 'submitting', error: '' } : state
    case 'failed': return state.phase === 'submitting' ? { ...state, phase: 'confirming', error: action.message } : state
    case 'succeeded': return state.phase === 'submitting' ? { phase: 'idle', nextStatus: null, error: '', notice: action.message } : state
    default: return state
  }
}

export function statusChangeNotice({ customer, changed } = {}) {
  const suspended = String(customer?.status || '').toLowerCase() === 'blocked'
  const name = customer?.fullName || 'The customer'
  if (!changed) return suspended ? `${name} is already suspended.` : `${name} is already active.`
  return suspended ? `${name} has been suspended and signed out of ServeEase.` : `${name} has been activated and can sign in again.`
}

// Maps PATCH failures to what the employee should do next; the server message is kept where it is specific.
export function statusChangeError(error) {
  const message = error?.message || ''
  if (error?.status === 401 || /authentication is required|session is invalid or expired/i.test(message)) return 'Your session has expired or was signed out.'
  if (error?.status === 403) return message || 'You do not have permission to change this customer\'s status.'
  if (error?.status === 404) return 'This customer record no longer exists. Return to Customer Operations and refresh the list.'
  if (error?.status === 400 || error?.status === 409) return message || 'The status change was not accepted.'
  if (error?.status >= 500) return 'The server could not update the customer status. Please try again.'
  return message ? `The status change could not be sent: ${message}` : 'The status change could not be sent. Please try again.'
}

