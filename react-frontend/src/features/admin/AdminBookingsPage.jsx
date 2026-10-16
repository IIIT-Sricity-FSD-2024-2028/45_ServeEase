import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { getBooking, listBookings } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

const standardBookingGroups = [
  { key: 'Requested', statuses: ['Requested', 'Pending'], className: 'requested', subtitle: 'bookings awaiting provider approval', icon: '◔' },
  { key: 'Upcoming', statuses: ['Upcoming', 'Accepted', 'Scheduled', 'In Progress'], className: 'upcoming', subtitle: 'bookings scheduled', icon: '◷' },
  { key: 'Completed', statuses: ['Completed', 'Complete'], className: 'completed', subtitle: 'bookings successfully completed', icon: '✓' },
  { key: 'Cancelled', statuses: ['Cancelled', 'Canceled'], className: 'cancelled', subtitle: 'bookings cancelled', icon: '×' },
]

function normalizedStatus(booking) {
  const rawStatus = String(booking.status || booking.bookingStatus || 'Requested').trim()
  const key = rawStatus.toLowerCase()
  const reason = booking.cancellationReason || booking.reason || booking.cancelReason
  if (String(reason || '').startsWith('Automatically cancelled because the provider did not confirm')) return 'Requested'
  const group = standardBookingGroups.find((item) => item.statuses.some((status) => status.toLowerCase() === key))
  return group?.key || rawStatus
}

function groupBookings(bookings) {
  const knownStatuses = new Set(standardBookingGroups.map((group) => group.key))
  const normalizedBookings = bookings.map((booking) => ({ ...booking, displayStatus: normalizedStatus(booking) }))
  const extraGroups = [...new Set(normalizedBookings.map((booking) => booking.displayStatus).filter((status) => status && !knownStatuses.has(status)))].map((status) => ({
    key: status,
    statuses: [status],
    className: 'other',
    subtitle: 'bookings with this status',
    icon: '•',
  }))
  return { rows: normalizedBookings, groups: [...standardBookingGroups, ...extraGroups] }
}

function formatDate(value) {
  if (!value) return 'Not available'
  const dayFirst = String(value).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  const date = dayFirst
    ? new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function paymentStatus(booking) {
  return booking.paymentStatus || booking.payment || booking.paymentState || 'Pending'
}

function paymentTone(value) {
  const status = String(value || '').toLowerCase()
  if (status.includes('paid') || status.includes('success')) return 'paid'
  if (status.includes('refund')) return 'refunded'
  return 'pending'
}

function BookingStat({ label, count, icon, attention = false }) {
  return <article className={`admin-booking-stat${attention ? ' admin-booking-stat--attention' : ''}`}>
    <span>{label}<span aria-hidden="true">{icon}</span></span><strong>{count}</strong>
  </article>
}

function BookingCard({ booking, onView }) {
  const status = booking.displayStatus || normalizedStatus(booking)
  const payment = paymentStatus(booking)
  const completed = status === 'Completed'
  const cancelled = status === 'Cancelled'
  const dateLabel = completed ? 'Completed' : 'Service Date'
  const date = completed ? (booking.receivedDate || booking.date || booking.serviceDate) : (booking.date || booking.serviceDate || booking.bookingDate)
  const secondaryLabel = cancelled ? 'Reason' : 'Service Time'
  const secondaryValue = cancelled
    ? booking.cancellationReason || booking.reason || booking.cancelReason || 'N/A'
    : booking.time || booking.serviceTime || 'N/A'
  const customer = booking.customerName || booking.customer || booking.customerEmail || booking.customerId
  const provider = booking.provider || booking.providerName || booking.providerId
  const category = booking.category || booking.serviceCategory || booking.serviceType || 'N/A'
  const service = booking.service || booking.serviceType || booking.category || 'N/A'

  return <article className="admin-booking-card">
    <div className="admin-booking-card-main">
      <div className="admin-booking-card-title"><h3>{show(booking.id || booking.bookingId)}</h3><span className={`admin-booking-chip admin-booking-chip--${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span><span className={`admin-booking-chip admin-booking-chip--${paymentTone(payment)}`}>{show(payment)}</span></div>
      <p className="admin-booking-card-service"><strong>{show(category)}</strong> - {show(service)}</p>
      <div className="admin-booking-card-meta">
        <span>Customer: {show(customer)}</span><span>Provider: {show(provider)}</span>
        <span>{dateLabel}: {formatDate(date)}</span><span>{secondaryLabel}: {show(secondaryValue)}</span><span>Amount: {money(booking.amount)}</span>
      </div>
    </div>
    <button aria-label={`View details for ${booking.id || booking.bookingId}`} className="admin-button admin-button--secondary admin-booking-view" onClick={() => onView(String(booking.id || booking.bookingId))} type="button">◉ View<br />Details</button>
  </article>
}

function BookingDetails({ booking, onClose }) {
  const status = normalizedStatus(booking)
  const payment = paymentStatus(booking)
  const serviceInfo = [
    ['Category:', booking.category || booking.serviceCategory || 'N/A'],
    ['Service Type:', booking.service || booking.serviceType || booking.category || 'N/A'],
    ['Provider:', booking.provider || booking.providerName || booking.providerId || 'N/A'],
    ['Service Time:', booking.time || booking.serviceTime || 'N/A'],
  ]
  const customerInfo = [
    ['Name', booking.customerName || booking.customer || booking.customerId || 'N/A'],
    ['Email', booking.customerEmail || booking.email || 'N/A'],
  ]

  return <div className="admin-modal-backdrop admin-booking-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section aria-labelledby="admin-booking-modal-title" aria-modal="true" className="admin-booking-modal" role="dialog">
      <header className="admin-booking-modal-header"><div><h2 id="admin-booking-modal-title">{show(booking.id || booking.bookingId)}</h2><p>Booking Details</p></div><button aria-label="Close booking details" className="admin-booking-modal-close" onClick={onClose} type="button">×</button></header>
      <div className="admin-booking-modal-body">
        <div className="admin-booking-modal-badges"><span className={`admin-booking-chip admin-booking-chip--${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span><span className={`admin-booking-chip admin-booking-chip--${paymentTone(payment)}`}>Payment: {show(payment)}</span></div>
        <section><h3>Service Information</h3><dl className="admin-booking-detail-grid">{serviceInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
        <section><h3>Customer Information</h3><dl className="admin-booking-customer-info">{customerInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
      </div>
      <footer className="admin-booking-modal-footer"><button className="admin-button admin-button--secondary admin-button--full" onClick={onClose} type="button">Close</button></footer>
    </section>
  </div>
}

export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('booking')
  const bookings = useAdminData(listBookings)
  const loadSelectedBooking = useCallback(() => selectedId ? getBooking(selectedId) : Promise.resolve(null), [selectedId])
  const selectedBooking = useAdminData(loadSelectedBooking)
  const records = useMemo(() => Array.isArray(bookings.data) ? bookings.data : [], [bookings.data])
  const { rows, groups } = useMemo(() => groupBookings(records), [records])

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

  useEffect(() => {
    if (!selectedId) return undefined
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      const next = new URLSearchParams(searchParams)
      next.delete('booking')
      setSearchParams(next)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, searchParams, setSearchParams])

  return <AdminAccessGate>
    <section className="admin-page admin-monitor-bookings">
      <AdminPageHeader section="Monitor Bookings" title="Monitor All Bookings" description="View and manage all bookings across the platform organized by status." />
      {bookings.isLoading && <LoadingState message="Loading booking summary…" />}
      {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button" onClick={bookings.reload} type="button">Retry</button></div>}
      {!bookings.isLoading && !bookings.error && <div className="admin-booking-summary">
        {standardBookingGroups.map((group) => <BookingStat attention={group.className === 'requested' || group.className === 'cancelled'} count={rows.filter((booking) => booking.displayStatus === group.key).length} icon={group.icon} key={group.key} label={group.key} />)}
      </div>}
      {!bookings.isLoading && !bookings.error && records.length === 0 && <EmptyState message="No bookings are available." />}
      {!bookings.isLoading && !bookings.error && rows.length > 0 && <div className="admin-booking-sections">
        {groups.map((group) => {
          const items = rows.filter((booking) => booking.displayStatus === group.key)
          return <section aria-label={`${group.key} bookings`} className={`admin-booking-section admin-booking-section--${group.className}`} key={group.key}>
            <div className="admin-booking-section-heading"><span aria-hidden="true">{group.icon}</span><div><h2>{group.key} Bookings</h2><p>{items.length} {group.subtitle}</p></div></div>
            {items.length ? <div className="admin-booking-card-list">{items.map((booking, index) => <BookingCard booking={booking} key={booking.id || index} onView={selectBooking} />)}</div> : <EmptyState message="No bookings found in this section." />}
          </section>
        })}
      </div>}
      <div className="admin-category-back"><Link className="admin-button admin-button--secondary" to="/admin">‹ Return to Dashboard</Link></div>

      {selectedId && <>
        {selectedBooking.isLoading && <div className="admin-modal-backdrop admin-booking-modal-backdrop"><section aria-modal="true" className="admin-booking-modal" role="dialog"><LoadingState message="Loading booking details…" /></section></div>}
        {!selectedBooking.isLoading && selectedBooking.error && <div className="admin-modal-backdrop admin-booking-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBooking() }}><section aria-modal="true" className="admin-booking-modal" role="dialog"><div className="admin-feedback admin-feedback--error"><ErrorState message={selectedBooking.error} /><button className="admin-button" onClick={selectedBooking.reload} type="button">Retry</button><button className="admin-button admin-button--secondary" onClick={closeBooking} type="button">Close</button></div></section></div>}
        {!selectedBooking.isLoading && !selectedBooking.error && !selectedBooking.data && <div className="admin-modal-backdrop admin-booking-modal-backdrop"><section aria-modal="true" className="admin-booking-modal" role="dialog"><EmptyState message="Booking details are not available." /><button className="admin-button admin-button--secondary" onClick={closeBooking} type="button">Close</button></section></div>}
        {selectedBooking.data && !selectedBooking.isLoading && <BookingDetails booking={selectedBooking.data} onClose={closeBooking} />}
      </>}
    </section>
  </AdminAccessGate>
}
