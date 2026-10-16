import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { getBooking, listBookings, listCatalog } from './adminApi'
import { matchesAdminSearch, useAdminSearch } from './adminSearch'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

const standardBookingGroups = [
  { key: 'Requested', statuses: ['Requested', 'Pending'], className: 'requested', subtitle: 'bookings awaiting provider approval', icon: '◔' },
  { key: 'Upcoming', statuses: ['Upcoming', 'Accepted', 'Scheduled', 'In Progress'], className: 'upcoming', subtitle: 'bookings scheduled', icon: '🕘' },
  { key: 'Completed', statuses: ['Completed', 'Complete'], className: 'completed', subtitle: 'bookings successfully completed', icon: '✓' },
  { key: 'Cancelled', statuses: ['Cancelled', 'Canceled'], className: 'cancelled', subtitle: 'bookings cancelled', icon: '⊗' },
]

// superuser.js renderBookingsPage() summary: Completed, Upcoming, Requested, Cancelled (+ Other when present).
const summaryCards = [
  { key: 'Completed', icon: '✔' },
  { key: 'Upcoming', icon: '🕘' },
  { key: 'Requested', icon: '!', attention: true },
  { key: 'Cancelled', icon: '✕', attention: true },
]

// Bookings carry the catalog category id (e.g. home-cleaning); show the category's name.
function categoryLabel(value, categoryNames) {
  if (!value) return value
  return categoryNames.get(String(value).toLowerCase()) || value
}

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

// This page is an operations view: only show payment values the booking record actually contains.
function paymentStatus(booking) {
  return booking.paymentStatus || booking.payment || booking.paymentState || 'Not recorded'
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

function BookingCard({ booking, categoryNames, onView }) {
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
  const category = categoryLabel(booking.category || booking.serviceCategory, categoryNames) || booking.serviceType || 'N/A'
  const service = booking.service || booking.serviceType || booking.category || 'N/A'

  return <article className="admin-booking-card">
    <div className="admin-booking-card-main">
      <div className="admin-booking-card-title"><h3>{show(booking.id || booking.bookingId)}</h3><span className={`admin-booking-chip admin-booking-chip--${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span><span className={`admin-booking-chip admin-booking-chip--${paymentTone(payment)}`}>{show(payment)}</span></div>
      <p className="admin-booking-card-service"><strong>{show(category)}</strong> - {show(service)}</p>
      <div className="admin-booking-card-meta">
        <span>Customer: {show(customer)}</span><span>Provider: {show(provider)}</span>
        <span>{dateLabel}: {formatDate(date)}</span><span>{secondaryLabel}: {show(secondaryValue)}</span><span>Amount: {money(booking.customerTotal ?? booking.amount)}</span>
      </div>
    </div>
    <button aria-label={`View details for ${booking.id || booking.bookingId}`} className="admin-button admin-button--secondary admin-booking-view" onClick={() => onView(String(booking.id || booking.bookingId))} type="button">◉ View<br />Details</button>
  </article>
}

function BookingDetails({ booking, categoryNames, onClose }) {
  const status = normalizedStatus(booking)
  const payment = paymentStatus(booking)
  const serviceInfo = [
    ['Category:', categoryLabel(booking.category || booking.serviceCategory, categoryNames) || 'N/A'],
    ['Service Type:', booking.service || booking.serviceType || booking.category || 'N/A'],
    ['Provider:', booking.provider || booking.providerName || booking.providerId || 'N/A'],
    ['Service Time:', booking.time || booking.serviceTime || 'N/A'],
    ['Service Fee:', money(booking.serviceFee)],
    ['Tax:', money(booking.taxAmount)],
    ['Platform Fee:', money(booking.platformFeeAmount)],
    ['Customer Total:', money(booking.customerTotal ?? booking.amount)],
    ['Payment Method:', booking.paymentMethod || 'N/A'],
    ['Payment ID:', booking.paymentId || 'N/A'],
    ['Payment Date:', formatDate(booking.paymentDate)],
    ['Created:', formatDate(booking.createdAt)],
    ['Last Status Update:', formatDate(booking.statusUpdatedAt)],
  ]
  const customerInfo = [
    ['Name', booking.customerName || booking.customer || booking.customerId || 'N/A'],
    ['Email', booking.customerEmail || booking.email || 'N/A'],
    ['Phone', booking.customerPhone || booking.phone || 'N/A'],
    ['Address', booking.address || 'N/A'],
  ]
  const lifecycleInfo = [
    ['Status', status],
    ['Payout Status', booking.payoutStatus || 'N/A'],
    ['Provider Payout', money(booking.providerPayout ?? booking.providerPayoutAmount)],
    ['Platform Revenue', money(booking.platformRevenueAmount)],
    ['Cancellation Reason', booking.cancellationReason || booking.reason || booking.cancelReason || 'N/A'],
    ['Cancelled At', formatDate(booking.cancelledAt)],
    ['Cancelled By', booking.cancellationActor || 'N/A'],
    ['Refund Status', booking.refundStatus || 'N/A'],
    ['Refund Amount', money(booking.refundAmount)],
    ['Refund Date', formatDate(booking.refundDate)],
  ]

  return <div className="admin-modal-backdrop admin-booking-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section aria-labelledby="admin-booking-modal-title" aria-modal="true" className="admin-booking-modal" role="dialog">
      <header className="admin-booking-modal-header"><div><h2 id="admin-booking-modal-title">{show(booking.id || booking.bookingId)}</h2><p>Booking Details</p></div><button aria-label="Close booking details" className="admin-booking-modal-close" onClick={onClose} type="button">×</button></header>
      <div className="admin-booking-modal-body">
        <div className="admin-booking-modal-badges"><span className={`admin-booking-chip admin-booking-chip--${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span><span className={`admin-booking-chip admin-booking-chip--${paymentTone(payment)}`}>Payment: {show(payment)}</span></div>
        <section><h3>Service Information</h3><dl className="admin-booking-detail-grid">{serviceInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
        <section><h3>Customer Information</h3><dl className="admin-booking-customer-info">{customerInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
        <section><h3>Booking &amp; settlement record</h3><dl className="admin-booking-detail-grid">{lifecycleInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl></section>
      </div>
      <footer className="admin-booking-modal-footer"><button className="admin-button admin-button--secondary admin-button--full" onClick={onClose} type="button">Close</button></footer>
    </section>
  </div>
}

export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('booking')
  const bookings = useAdminData(listBookings)
  const catalog = useAdminData(listCatalog)
  const searchTerm = useAdminSearch('/admin/bookings')
  const categoryNames = useMemo(() => new Map((Array.isArray(catalog.data?.categories) ? catalog.data.categories : [])
    .filter((category) => category?.id && category?.name)
    .map((category) => [String(category.id).toLowerCase(), category.name])), [catalog.data])
  const loadSelectedBooking = useCallback(() => selectedId ? getBooking(selectedId) : Promise.resolve(null), [selectedId])
  const selectedBooking = useAdminData(loadSelectedBooking)
  const records = useMemo(() => Array.isArray(bookings.data) ? bookings.data : [], [bookings.data])
  const { rows, groups } = useMemo(() => groupBookings(records), [records])
  // superuser.js buildBookingSections(): the topbar term narrows every section; the summary counts stay whole.
  const matchingRows = useMemo(() => rows.filter((booking) => matchesAdminSearch([
    booking.id || booking.bookingId, booking.customerName || booking.customer, booking.customerEmail || booking.email,
    booking.provider || booking.providerName, booking.category, categoryLabel(booking.category, categoryNames), booking.service, booking.serviceType,
  ], searchTerm)), [rows, searchTerm, categoryNames])
  const otherCount = rows.filter((booking) => !standardBookingGroups.some((group) => group.key === booking.displayStatus)).length

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
        {summaryCards.map((card) => <BookingStat attention={card.attention} count={rows.filter((booking) => booking.displayStatus === card.key).length} icon={card.icon} key={card.key} label={card.key} />)}
        {otherCount > 0 && <BookingStat count={otherCount} icon="•" label="Other" />}
      </div>}
      {!bookings.isLoading && !bookings.error && records.length === 0 && <EmptyState message="No bookings are available." />}
      {!bookings.isLoading && !bookings.error && rows.length > 0 && <div className="admin-booking-sections">
        {groups.map((group) => {
          const items = matchingRows.filter((booking) => booking.displayStatus === group.key)
          return <section aria-label={`${group.key} bookings`} className={`admin-booking-section admin-booking-section--${group.className}`} key={group.key}>
            <div className="admin-booking-section-heading"><span aria-hidden="true">{group.icon}</span><div><h2>{group.key} Bookings</h2><p>{items.length} {group.subtitle}</p></div></div>
            {items.length ? <div className="admin-booking-card-list">{items.map((booking, index) => <BookingCard booking={booking} categoryNames={categoryNames} key={booking.id || index} onView={selectBooking} />)}</div> : <div className="admin-empty-card">No bookings found in this section.</div>}
          </section>
        })}
      </div>}
      <div className="admin-category-back"><Link className="admin-button admin-button--secondary" to="/admin">‹ Return to Dashboard</Link></div>

      {selectedId && <>
        {selectedBooking.isLoading && <div className="admin-modal-backdrop admin-booking-modal-backdrop"><section aria-modal="true" className="admin-booking-modal" role="dialog"><LoadingState message="Loading booking details…" /></section></div>}
        {!selectedBooking.isLoading && selectedBooking.error && <div className="admin-modal-backdrop admin-booking-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBooking() }}><section aria-modal="true" className="admin-booking-modal" role="dialog"><div className="admin-feedback admin-feedback--error"><ErrorState message={selectedBooking.error} /><button className="admin-button" onClick={selectedBooking.reload} type="button">Retry</button><button className="admin-button admin-button--secondary" onClick={closeBooking} type="button">Close</button></div></section></div>}
        {!selectedBooking.isLoading && !selectedBooking.error && !selectedBooking.data && <div className="admin-modal-backdrop admin-booking-modal-backdrop"><section aria-modal="true" className="admin-booking-modal" role="dialog"><EmptyState message="Booking details are not available." /><button className="admin-button admin-button--secondary" onClick={closeBooking} type="button">Close</button></section></div>}
        {selectedBooking.data && !selectedBooking.isLoading && <BookingDetails booking={selectedBooking.data} categoryNames={categoryNames} onClose={closeBooking} />}
      </>}
    </section>
  </AdminAccessGate>
}
