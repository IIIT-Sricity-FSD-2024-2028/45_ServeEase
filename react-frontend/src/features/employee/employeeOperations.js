// Logic for the employee Customer Operations pages (front-end/JavaScript/customer-operations*.js), applied to
// the API responses (Provider Operations logic is in providerOperations.js). Missing values are shown as "N/A" exactly like the original.

export const NOT_AVAILABLE = 'N/A'

export function display(value) {
  return value === undefined || value === null || String(value).trim() === '' ? NOT_AVAILABLE : String(value)
}

const MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 }
const pad = (value) => String(value).padStart(2, '0')

// api.js ServeEaseDate.formatDate(): DD-MM-YYYY from ISO, DD/MM/YYYY, "12 March 2026" or any Date-parsable value.
export function formatDate(value) {
  const textValue = String(value ?? '').trim()
  if (!textValue) return display(null)
  let parts = null
  let match = textValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) parts = [match[3], match[2], match[1]]
  if (!parts && (match = textValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))) parts = [match[1], match[2], match[3]]
  if (!parts && (match = textValue.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)) && MONTHS[match[2].toLowerCase()] !== undefined) parts = [match[1], MONTHS[match[2].toLowerCase()] + 1, match[3]]
  if (!parts) {
    const parsed = new Date(textValue)
    if (!Number.isNaN(parsed.getTime())) parts = [parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear()]
  }
  return parts ? `${pad(parts[0])}-${pad(parts[1])}-${parts[2]}` : textValue
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

// filteredCustomers(): status filter ("N/A" = no recorded status) and free-text search. Customers do not
// record a location anywhere in ServeEase (sign-up never asks for one), so it is not a searchable field.
export function filterCustomers(customers, { status = 'all', query = '' } = {}) {
  const term = query.trim().toLowerCase()
  return customers.filter((customer) => {
    if (status !== 'all' && display(customer.status) !== status) return false
    if (!term) return true
    return [customer.id, customer.fullName, customer.email, customer.phone, display(customer.status)]
      .join(' ').toLowerCase().includes(term)
  })
}

// A booking is always in exactly one of these three groups, so the counts add back up to the total.
const upcomingBookingStatuses = ['pending', 'accepted']
const closedBookingStatuses = ['cancelled', 'rejected']
const openTicketStatuses = ['open', 'pending', 'in progress', 'escalated', 'under review']

// customer-operations-detail.js renderStats(), over the booking statuses the backend actually stores
// (Pending, Accepted, Completed, Cancelled, Rejected): total = upcoming + completed + cancelled.
export function customerDetailStats(bookings, tickets) {
  const status = (value) => String(value || '').toLowerCase().trim()
  return {
    total: bookings.length,
    upcoming: bookings.filter((booking) => upcomingBookingStatuses.includes(status(booking.status))).length,
    completed: bookings.filter((booking) => status(booking.status) === 'completed').length,
    cancelled: bookings.filter((booking) => closedBookingStatuses.includes(status(booking.status))).length,
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

