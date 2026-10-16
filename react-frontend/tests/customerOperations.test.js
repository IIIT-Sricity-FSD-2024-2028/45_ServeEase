import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import {
  attachmentHref, attachmentValidationError, belongsToCustomer, bookingTabView, canCustomerCancel, canonicalBookingId, countForTab,
  filterTickets, formatPrice, openTicketForBooking, statusPillClass, ticketStatusClass, validateTicketForm,
} from '../src/features/customer/customerOperations.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const { BookingCard } = await import('../src/features/customer/bookings/BookingCard.jsx')
const { BookingHistory } = await import('../src/features/customer/bookings/BookingHistory.jsx')
const { BookingTabs } = await import('../src/features/customer/bookings/BookingTabs.jsx')
const { AuthContext } = await import('../src/context/authContext.js')
const { default: CustomerBookingsPage } = await import('../src/features/customer/bookings/CustomerBookingsPage.jsx')
const { default: CustomerSupportPage } = await import('../src/features/customer/support/CustomerSupportPage.jsx')
const { default: CustomerTicketsPage } = await import('../src/features/customer/tickets/CustomerTicketsPage.jsx')
const { default: CustomerProfilePage } = await import('../src/features/customer/profile/CustomerProfilePage.jsx')

const customer = { userId: 'CUS001', email: 'abhi@example.test', role: 'customer' }
const booking = (overrides) => ({ id: 'BOOK-1', service: 'AC Repair', provider: 'CoolFix', date: '2026-10-20', time: '09:00-12:00', address: '12 MG Road', amount: 500, customerTotal: 575, status: 'Pending', paymentStatus: 'Pending', customerId: 'CUS001', ...overrides })
const noop = () => {}
const inRouter = (element, path = '/') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, element))
const asCustomer = (page, path) => inRouter(createElement(AuthContext.Provider, { value: { currentUser: customer, isAuthenticated: true, ready: true } }, createElement(page)), path)

test('keeps only the signed-in customer’s records, by id first and email second', () => {
  assert.equal(belongsToCustomer(booking(), customer), true)
  assert.equal(belongsToCustomer(booking({ customerId: 'CUS002' }), customer), false)
  assert.equal(belongsToCustomer({ customerEmail: 'ABHI@example.test' }, customer), true)
  assert.equal(belongsToCustomer({ customerEmail: 'other@example.test' }, customer), false)
  assert.equal(belongsToCustomer({}, customer), false)
})

test('maps statuses to the original pill colours without inventing success', () => {
  assert.equal(statusPillClass('Accepted'), 'status-accepted')
  assert.equal(statusPillClass('Completed'), 'status-accepted')
  assert.equal(statusPillClass('Successful'), 'status-accepted')
  assert.equal(statusPillClass('Pending'), 'status-pending')
  assert.equal(statusPillClass('Refunded'), 'status-refunded')
  assert.equal(statusPillClass('Rejected'), 'status-cancelled')
  assert.equal(ticketStatusClass('Resolved by Support'), 'resolved-by-support')
  assert.equal(formatPrice(undefined), 'Not provided')
  assert.equal(formatPrice(575), '₹575')
  assert.equal(formatPrice(575.5), '₹575.50')
})

test('splits bookings into the original My Bookings sections per tab', () => {
  const bookings = [booking(), booking({ id: 'B2', status: 'Accepted' }), booking({ id: 'B3', status: 'Completed' }), booking({ id: 'B4', status: 'Rejected' }), booking({ id: 'B5', status: 'Cancelled' })]
  const all = bookingTabView(bookings, 'All')
  assert.deepEqual(all.upcoming.map((item) => item.id), ['BOOK-1', 'B2'])
  assert.deepEqual(all.history.map((item) => item.id), ['B3', 'B4', 'B5'])
  assert.equal(all.historyHeading, 'Past Booking History')
  const pending = bookingTabView(bookings, 'Pending')
  assert.equal(pending.history, null)
  assert.equal(pending.upcomingHeading, 'Pending Bookings')
  assert.deepEqual(bookingTabView(bookings, 'Cancelled').history.map((item) => item.id), ['B4', 'B5'])
  assert.equal(countForTab(bookings, 'All'), 5)
  assert.equal(countForTab(bookings, 'Accepted'), 1)
})

test('allows cancellation only for the transitions the backend accepts from customers', () => {
  assert.equal(canCustomerCancel(booking({ status: 'Pending' })), true)
  assert.equal(canCustomerCancel(booking({ status: 'Accepted' })), true)
  for (const status of ['Completed', 'Cancelled', 'Rejected', 'Requested']) assert.equal(canCustomerCancel(booking({ status })), false)
})

test('validates support tickets against the original fields, the API limits and the customer’s own bookings', () => {
  const own = [booking()]
  assert.deepEqual(Object.keys(validateTicketForm({}, own)).sort(), ['bookingId', 'description', 'subject', 'ticketType'])
  assert.equal(validateTicketForm({ bookingId: 'BOOK-999', ticketType: 'Other', subject: 'x', description: '0123456789' }, own).bookingId, 'Enter a booking reference from your own bookings.')
  assert.equal(validateTicketForm({ bookingId: 'book-1', ticketType: 'Booking Issue', subject: 'x', description: '0123456789' }, own).ticketType, 'Select an issue category.')
  assert.equal(validateTicketForm({ bookingId: 'book-1', ticketType: 'Late Arrival', subject: 'Late', description: 'too short' }, own).description, 'Describe the issue in at least 10 characters.')
  assert.deepEqual(validateTicketForm({ bookingId: 'book-1', ticketType: 'Late Arrival', subject: 'Late', description: 'Provider arrived two hours late.' }, own), {})
  assert.equal(canonicalBookingId(own, ' book-1 '), 'BOOK-1')
})

test('finds an open ticket for a booking and searches tickets like the original My Tickets page', () => {
  const tickets = [
    { ticketId: 'TKT-1', relatedBookingId: 'BOOK-1', status: 'Resolved', ticketType: 'Overcharging', providerName: 'CoolFix' },
    { ticketId: 'TKT-2', relatedBookingId: 'BOOK-1', status: 'Pending', ticketType: 'Late Arrival', providerName: 'CoolFix' },
  ]
  assert.equal(openTicketForBooking(tickets, 'book-1').ticketId, 'TKT-2')
  assert.equal(openTicketForBooking(tickets.slice(0, 1), 'BOOK-1'), null)
  assert.deepEqual(filterTickets(tickets, 'overch').map((ticket) => ticket.ticketId), ['TKT-1'])
  assert.equal(filterTickets(tickets, '').length, 2)
})

test('checks attachments like the upload endpoint and links them to the backend origin', () => {
  assert.equal(attachmentValidationError({ name: 'proof.png', type: 'image/png', size: 1024 }), '')
  assert.equal(attachmentValidationError({ name: 'proof.exe', type: 'application/x-msdownload', size: 1024 }), 'Choose a PDF, JPG, PNG, or WebP file.')
  assert.equal(attachmentValidationError({ name: 'big.pdf', type: 'application/pdf', size: 6000 * 1024 }), 'Attachment must be 5000 KB or smaller.')
  assert.equal(attachmentHref('/uploads/tickets/a.png', 'http://localhost:3000/api'), 'http://localhost:3000/uploads/tickets/a.png')
  assert.equal(attachmentHref('', 'http://localhost:3000/api'), '')
})

test('renders an upcoming card with Cancel only while the booking is cancellable', () => {
  const pending = inRouter(createElement(BookingCard, { booking: booking(), onCancel: noop, onRaiseTicket: noop, onViewDetails: noop }))
  assert.match(pending, /booking-card-customer/)
  assert.match(pending, /₹575</)
  assert.match(pending, /🕒 09:00-12:00</)
  assert.match(pending, />Cancel</)
  const completed = inRouter(createElement(BookingCard, { booking: booking({ status: 'Completed' }), onCancel: noop, onRaiseTicket: noop, onViewDetails: noop }))
  assert.doesNotMatch(completed, />Cancel</)
})

test('renders the history table with the review action disabled because the backend has no review API', () => {
  const html = inRouter(createElement(BookingHistory, { bookings: [booking({ status: 'Completed' }), booking({ id: 'B2', status: 'Cancelled' })], emptyLabel: 'none', onRaiseTicket: noop, onViewDetails: noop }))
  assert.match(html, /Rating &amp; Feedback/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>⭐ Rate Service<\/button>/)
  assert.match(html, /<td>—<\/td>/)
  const empty = inRouter(createElement(BookingHistory, { bookings: [], emptyLabel: 'No past bookings found.', onRaiseTicket: noop, onViewDetails: noop }))
  assert.match(empty, /colSpan="8"|colspan="8"/)
  const tabs = inRouter(createElement(BookingTabs, { activeTab: 'Pending', bookings: [booking()], onChange: noop }))
  assert.match(tabs, /class="tab-btn active"[^>]*>Pending <span>1<\/span>/)
})

test('pages render their original headings and a loading state before the API answers', () => {
  const bookings = asCustomer(CustomerBookingsPage, '/customer/bookings')
  assert.match(bookings, /<h1>My Bookings<\/h1>/)
  assert.match(bookings, /Loading your bookings…/)
  const support = asCustomer(CustomerSupportPage, '/customer/support?bookingRef=BOOK-1')
  assert.match(support, /<h1>Customer Support Center<\/h1>/)
  assert.match(support, /value="BOOK-1"[^>]*readOnly|readOnly=""[^>]*value="BOOK-1"|readonly=""[^>]*value="BOOK-1"|value="BOOK-1"[^>]*readonly/)
  assert.match(support, /Loading your support tickets…/)
  assert.doesNotMatch(support, /<option value="Booking Issue">/)
  const tickets = asCustomer(CustomerTicketsPage, '/customer/tickets')
  assert.match(tickets, /<h1>My Tickets<\/h1>/)
  const profile = asCustomer(CustomerProfilePage, '/customer/profile')
  assert.match(profile, /<h1>My Profile<\/h1>/)
  assert.match(profile, /Loading your profile…/)
})

test('sends the supported customer mutations to the real endpoints with the session bearer token', async () => {
  const calls = []
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ role: 'customer', userId: 'CUS001', email: 'abhi@example.test', token: 'tok' }) }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method || 'GET', body: options.body, auth: options.headers.get('Authorization') })
    return new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 })
  }
  const { bookingsApi, ticketsApi, authApi } = await import('../src/services/api.js')
  await bookingsApi.updateStatus('BOOK-1', 'Cancelled')
  await ticketsApi.createCustomer({ bookingId: 'BOOK-1', ticketType: 'Late Arrival', subject: 'Late', description: 'Provider arrived late.' })
  await ticketsApi.listMine()
  await authApi.session()
  assert.deepEqual(calls.map(({ url, method }) => `${method} ${url}`), [
    'PATCH http://localhost:3000/api/bookings/BOOK-1',
    'POST http://localhost:3000/api/tickets/customer',
    'GET http://localhost:3000/api/tickets/my-tickets',
    'GET http://localhost:3000/api/auth/session',
  ])
  assert.deepEqual(JSON.parse(calls[0].body), { status: 'Cancelled' })
  assert.equal(JSON.parse(calls[1].body).customerId, undefined)
  assert.ok(calls.every((call) => call.auth === 'Bearer tok'))

  globalThis.fetch = async () => new Response(JSON.stringify({ statusCode: 400, message: 'This booking status transition is not allowed.' }), { status: 400 })
  await assert.rejects(bookingsApi.updateStatus('BOOK-1', 'Cancelled'), /transition is not allowed/)
})
