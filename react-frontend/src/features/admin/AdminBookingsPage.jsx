import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { getBooking, listBookings, listEscalatedTickets } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import { settleBooking } from '../finance/revenueModel'
import './admin.css'

const standardBookingGroups = [
  { key: 'Requested', statuses: ['Requested', 'Pending'], className: 'requested', subtitle: 'bookings awaiting provider approval' },
  { key: 'Upcoming', statuses: ['Upcoming', 'Accepted'], className: 'upcoming', subtitle: 'bookings scheduled' },
  { key: 'Completed', statuses: ['Completed'], className: 'completed', subtitle: 'bookings successfully completed' },
  { key: 'Cancelled', statuses: ['Cancelled'], className: 'cancelled', subtitle: 'bookings cancelled' },
]

function bookingGroups(bookings) {
  const known = new Set(standardBookingGroups.flatMap((group) => group.statuses))
  const extra = [...new Set(bookings.map((booking) => booking.status).filter((status) => status && !known.has(status)))].map((status) => ({ key: status, statuses: [status], className: 'other', subtitle: 'bookings with this status' }))
  return [...standardBookingGroups, ...extra]
}

function isInGroup(booking, group) {
  return group.statuses.includes(booking.status)
}

function matchesSearch(booking, query) {
  return [booking.id, booking.customerName, booking.customerEmail, booking.customerId, booking.provider, booking.providerId, booking.service, booking.category]
    .some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(query))
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function SummaryCard({ label, count, attention = false }) {
  return <article className={`admin-stat-card${attention ? ' admin-stat-card--attention' : ''}`}><span>{label}<span>SE</span></span><strong>{count}</strong></article>
}

export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('booking')
  const [query, setQuery] = useState('')
  const bookings = useAdminData(listBookings)
  const tickets = useAdminData(listEscalatedTickets)
  const loadSelectedBooking = useCallback(() => selectedId ? getBooking(selectedId) : Promise.resolve(null), [selectedId])
  const selectedBooking = useAdminData(loadSelectedBooking)
  const bookingRecords = useMemo(() => Array.isArray(bookings.data) ? bookings.data : [], [bookings.data])
  const ticketRecords = useMemo(() => Array.isArray(tickets.data) ? tickets.data : [], [tickets.data])
  const queryText = query.trim().toLocaleLowerCase()
  const groups = useMemo(() => bookingGroups(bookingRecords), [bookingRecords])
  const visibleBookings = useMemo(() => bookingRecords.filter((booking) => matchesSearch(booking, queryText)), [bookingRecords, queryText])

  function selectBooking(id) {
    const next = new URLSearchParams(searchParams)
    next.set('booking', id)
    setSearchParams(next)
  }

  function closeBooking() {
    const next = new URLSearchParams(searchParams)
    next.delete('booking')
    setSearchParams(next)
  }

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader section="Monitor Bookings" title="Monitor All Bookings" description="View bookings across the platform, organized by status." />
        {bookings.isLoading && <LoadingState message="Loading booking summary…" />}
        {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button" onClick={bookings.reload} type="button">Retry</button></div>}
        {!bookings.isLoading && !bookings.error && <div className="admin-grid admin-booking-summary">
          {groups.map((group) => <SummaryCard attention={group.className === 'requested' || group.className === 'cancelled'} count={bookingRecords.filter((booking) => isInGroup(booking, group)).length} key={group.key} label={group.key} />)}
        </div>}

        <label className="admin-form admin-booking-search">Search bookings<input onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, customer, provider, or service" type="search" value={query} /></label>
        {bookings.data && !bookings.error && bookingRecords.length === 0 && <EmptyState message="No bookings are available." />}
        {!bookings.isLoading && !bookings.error && bookingRecords.length > 0 && visibleBookings.length === 0 && <EmptyState message="No bookings match this search." />}
        {!bookings.isLoading && !bookings.error && visibleBookings.length > 0 && groups.map((group) => {
          const items = visibleBookings.filter((booking) => isInGroup(booking, group))
          return <section className={`admin-booking-section admin-booking-section--${group.className}`} key={group.key}>
            <div className="admin-booking-section-heading"><div><h2>{group.key} Bookings</h2><p>{items.length} {group.subtitle}</p></div></div>
            {items.length === 0 ? <EmptyState message="No bookings found in this section." /> : <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>ID</th><th>Service</th><th>Customer</th><th>Provider</th><th>Date</th><th>Status</th><th>Amount</th><th>Details</th></tr></thead>
              <tbody>{items.map((booking, index) => <tr key={booking.id ?? index}>
                <td><strong>{show(booking.id)}</strong></td><td>{show(booking.service || booking.category)}</td>
                <td>{show(booking.customerName || booking.customerEmail || booking.customerId)}</td><td>{show(booking.provider || booking.providerId)}</td>
                <td>{formatDate(booking.date)}</td><td><StatusBadge tone={booking.status === 'Completed' ? 'ready' : 'neutral'}>{show(booking.status)}</StatusBadge></td>
                <td>{money(settleBooking(booking).customerTotal)}</td><td><button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectBooking(String(booking.id))} type="button">View details</button></td>
              </tr>)}</tbody>
            </table></div>}
          </section>
        })}

        {selectedId && <section className="admin-panel admin-booking-detail">
          <div className="admin-panel-heading"><h2>Booking Details</h2><button className="admin-button admin-button--secondary" onClick={closeBooking} type="button">Close</button></div>
          {selectedBooking.isLoading && <LoadingState message="Loading booking details…" />}
          {!selectedBooking.isLoading && selectedBooking.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={selectedBooking.error} /><button className="admin-button" onClick={selectedBooking.reload} type="button">Retry</button></div>}
          {!selectedBooking.isLoading && !selectedBooking.error && !selectedBooking.data && <EmptyState message="Booking details are not available." />}
          {selectedBooking.data && <dl className="admin-detail-grid">
            {Object.entries({
              'Booking ID': selectedBooking.data.id,
              Service: selectedBooking.data.service,
              Category: selectedBooking.data.category,
              'Service date': formatDate(selectedBooking.data.date),
              'Service time': selectedBooking.data.time,
              Status: selectedBooking.data.status,
              ...(() => {
                const settled = settleBooking(selectedBooking.data)
                return { 'Service fee': money(settled.serviceFee), 'Customer total': money(settled.customerTotal), 'Payment status': settled.paymentStatus }
              })(),
              'Payment method': selectedBooking.data.paymentMethod,
              Customer: selectedBooking.data.customerName,
              'Customer email': selectedBooking.data.customerEmail,
              'Customer phone': selectedBooking.data.customerPhone,
              Provider: selectedBooking.data.provider || selectedBooking.data.providerId,
              Address: selectedBooking.data.address,
              'Cancellation reason': selectedBooking.data.cancellationReason,
            }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}
          </dl>}
        </section>}

        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Escalated Tickets ({tickets.data ? ticketRecords.length : 'Not available'})</h2><Link className="admin-button admin-button--secondary" to="/admin/escalated-tickets">Open Ticket Resolution Panel</Link></div>
          {tickets.isLoading && <LoadingState message="Loading escalated tickets…" />}
          {!tickets.isLoading && tickets.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={tickets.error} /><button className="admin-button" onClick={tickets.reload} type="button">Retry</button></div>}
          {!tickets.isLoading && !tickets.error && ticketRecords.length === 0 && <EmptyState message="No escalated tickets are available." />}
          {!tickets.isLoading && !tickets.error && ticketRecords.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Ticket ID</th><th>Subject</th><th>Raised by</th><th>Priority</th><th>Status</th><th>Escalation reason</th><th>Action</th></tr></thead>
            <tbody>{ticketRecords.map((ticket, index) => <tr key={ticket.ticketId ?? index}>
              <td>{show(ticket.ticketId)}</td><td>{show(ticket.subject)}</td><td>{show(ticket.raisedByName)}</td><td>{show(ticket.priority)}</td><td>{show(ticket.status)}</td><td>{show(ticket.escalationReason)}</td>
              <td><Link to={`/admin/escalated-tickets?ticket=${encodeURIComponent(ticket.ticketId)}`}>View details</Link></td>
            </tr>)}</tbody>
          </table></div>}
        </section>
      </section>
    </AdminAccessGate>
  )
}
