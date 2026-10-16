// Shared customer-operations logic ported from front-end/JavaScript/customer.js and tickets.js.
// Everything here works on real API records; nothing fills in values the backend did not send.

export const customerTicketTypes = [
  'Poor Service Quality', 'Provider Not Arrived', 'Late Arrival', 'Overcharging', 'Misbehavior', 'Payment Issue',
  'Service Not Completed', 'Refund Request', 'Fraud', 'Safety Concern', 'Other',
]

export const bookingTabs = ['All', 'Pending', 'Requested', 'Accepted', 'Completed', 'Rejected', 'Cancelled']
const upcomingStatuses = ['Accepted', 'Pending', 'Requested']
const historyStatuses = ['Completed', 'Cancelled', 'Rejected']
// BookingsService.updateForCaller: a customer may move only Pending or Accepted bookings to Cancelled.
const customerCancellableStatuses = ['Pending', 'Accepted']
const closedTicketStatuses = ['Resolved', 'Resolved by Support', 'Rejected', 'Closed']

export function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

export function belongsToCustomer(record, user) {
  if (!record || !user) return false
  if (record.customerId && user.userId) return String(record.customerId) === String(user.userId)
  if (record.customerEmail && user.email) return String(record.customerEmail).toLowerCase() === String(user.email).toLowerCase()
  return false
}

// customer.js statusClass(): one colour family per state.
// There is no payment gateway (pressing Pay is the payment), so a payment is either Paid or Refunded.
export const paymentTag = (status) => (String(status || '').toLowerCase() === 'refunded' ? 'Refunded' : 'Paid')

// Bookings paid before the backend stored a transaction ID get the same reference it now assigns at payment.
export const transactionId = (booking) => booking?.paymentId || (booking?.id ? `TXN-${String(booking.id).replace(/^BOOK-/, '')}` : '')

export function statusPillClass(status) {
  const value = String(status || '').toLowerCase()
  if (['accepted', 'completed', 'successful', 'paid'].includes(value)) return 'status-accepted'
  if (value === 'refunded') return 'status-refunded'
  if (['failed', 'cancelled', 'rejected', 'incomplete'].includes(value)) return 'status-cancelled'
  return 'status-pending'
}

// tickets.js statusClass(): lower-case, hyphenated status name.
export function ticketStatusClass(status) {
  return String(status || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
}

// finance-engine.js formatCurrency(): whole rupees without decimals, otherwise two decimals.
export function formatPrice(amount) {
  if (!hasValue(amount) || !Number.isFinite(Number(amount))) return 'Not provided'
  const value = Number(amount)
  return `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// api.js ServeEaseDate.formatDate()/formatDateTime(): DD-MM-YYYY, and DD-MM-YYYY hh:mm AM/PM for a timestamp.
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad2 = (value) => String(value).padStart(2, '0')

function dateParts(value) {
  const text = String(value ?? '').trim()
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) return [Number(match[3]), Number(match[2]), Number(match[1])]
  if ((match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))) return [Number(match[1]), Number(match[2]), Number(match[3])]
  if ((match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)) && MONTHS[match[2].slice(0, 3).toLowerCase()]) return [Number(match[1]), MONTHS[match[2].slice(0, 3).toLowerCase()], Number(match[3])]
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : [parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear()]
}

export function formatDisplayDate(value) {
  if (!hasValue(value)) return 'Not provided'
  const parts = dateParts(value)
  return parts ? `${pad2(parts[0])}-${pad2(parts[1])}-${parts[2]}` : String(value)
}

export function formatDisplayDateTime(value) {
  if (!hasValue(value)) return 'Not provided'
  const date = formatDisplayDate(value)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || !/[T ]\d{1,2}:\d{2}/.test(String(value))) return date
  const hours = parsed.getHours() % 12 || 12
  return `${date} ${pad2(hours)}:${pad2(parsed.getMinutes())} ${parsed.getHours() >= 12 ? 'PM' : 'AM'}`
}

export function sortNewestFirst(records, field = 'createdAt') {
  return [...records].sort((left, right) => (Date.parse(right[field]) || 0) - (Date.parse(left[field]) || 0))
}

export function countForTab(bookings, tab) {
  return tab === 'All' ? bookings.length : bookings.filter((booking) => booking.status === tab).length
}

// initMyBookings(): which sections a tab shows and what they are called. The original "Cancelled" tab
// lists Rejected bookings too; Requested/Rejected (left unhandled there) follow the same split.
export function bookingTabView(bookings, tab) {
  if (tab === 'All') {
    return {
      upcoming: bookings.filter((booking) => upcomingStatuses.includes(booking.status)),
      history: bookings.filter((booking) => historyStatuses.includes(booking.status)),
      upcomingHeading: 'Upcoming Bookings',
      historyHeading: 'Past Booking History',
    }
  }
  if (upcomingStatuses.includes(tab)) {
    return { upcoming: bookings.filter((booking) => booking.status === tab), history: null, upcomingHeading: `${tab} Bookings` }
  }
  const history = tab === 'Cancelled'
    ? bookings.filter((booking) => booking.status === 'Cancelled' || booking.status === 'Rejected')
    : bookings.filter((booking) => booking.status === tab)
  return { upcoming: null, history, historyHeading: `${tab} Bookings` }
}

export function canCustomerCancel(booking) {
  return customerCancellableStatuses.includes(booking?.status)
}

export function isOpenTicket(ticket) {
  return !closedTicketStatuses.includes(ticket?.status)
}

export function openTicketForBooking(tickets, bookingId) {
  const reference = String(bookingId || '').trim().toLowerCase()
  if (!reference) return null
  return tickets.find((ticket) => String(ticket.relatedBookingId || '').toLowerCase() === reference && isOpenTicket(ticket)) || null
}

// initSupportCenter() requires booking, category, subject and description; the backend additionally
// needs a 10+ character description and an allowed ticket type. The booking must be one of the
// signed-in customer's own bookings (the API would otherwise accept an unknown reference).
export function validateTicketForm(form, ownBookings) {
  const errors = {}
  const bookingRef = String(form.bookingId || '').trim()
  if (!bookingRef) errors.bookingId = 'Enter the booking reference number.'
  else if (!ownBookings.some((booking) => String(booking.id).toLowerCase() === bookingRef.toLowerCase())) {
    errors.bookingId = 'Enter a booking reference from your own bookings.'
  }
  if (!customerTicketTypes.includes(form.ticketType)) errors.ticketType = 'Select an issue category.'
  if (!String(form.subject || '').trim()) errors.subject = 'Enter a subject.'
  else if (String(form.subject).trim().length > 120) errors.subject = 'Subject must be 120 characters or fewer.'
  const description = String(form.description || '').trim()
  if (description.length < 10) errors.description = 'Describe the issue in at least 10 characters.'
  else if (description.length > 1000) errors.description = 'Description must be 1000 characters or fewer.'
  return errors
}

export function canonicalBookingId(ownBookings, reference) {
  const match = ownBookings.find((booking) => String(booking.id).toLowerCase() === String(reference || '').trim().toLowerCase())
  return match ? match.id : String(reference || '').trim()
}

// renderMyTicketsPage(): search across ID, booking, type, provider and status.
export function filterTickets(tickets, term) {
  const query = String(term || '').trim().toLowerCase()
  if (!query) return tickets
  return tickets.filter((ticket) => [ticket.ticketId, ticket.relatedBookingId, ticket.ticketType, ticket.providerName, ticket.status, ticket.subject]
    .join(' ').toLowerCase().includes(query))
}

export const bookingTotal = (booking) => booking.customerTotal ?? booking.amount

// Payment History statistics. Every payment is Paid or Refunded; money returned to the customer is subtracted,
// so Total Payments Made + Refunded Amount adds back up to what was charged.
export function summarizePayments(payments) {
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100
  const number = (value) => (value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value))
  let charged = 0
  let refunded = 0
  let successful = 0
  payments.forEach((payment) => {
    const total = number(payment.customerTotal ?? payment.amount)
    const refundedTag = paymentTag(payment.paymentStatus) === 'Refunded'
    if (!refundedTag) successful += 1
    if (total == null) return
    const refund = Math.min(number(payment.refundAmount) ?? (refundedTag ? total : 0), total)
    charged += total
    refunded += refund
  })
  return { totalPaid: round(charged - refunded), successful, refunded: round(refunded) }
}

const maxAttachmentSize = 5000 * 1024
const attachmentExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])
const attachmentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

// Matches the backend upload filter (uploads/tickets): PDF or image, at most 5000 KB.
export function attachmentValidationError(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!attachmentExtensions.has(extension) || !attachmentMimeTypes.has(file.type)) return 'Choose a PDF, JPG, PNG, or WebP file.'
  if (file.size > maxAttachmentSize) return 'Attachment must be 5000 KB or smaller.'
  return ''
}

// Uploaded files are served by the backend origin under /uploads/.
export function attachmentHref(fileUrl, apiBaseUrl) {
  if (!hasValue(fileUrl)) return ''
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl
  return `${new URL(apiBaseUrl).origin}${String(fileUrl).startsWith('/') ? '' : '/'}${fileUrl}`
}
