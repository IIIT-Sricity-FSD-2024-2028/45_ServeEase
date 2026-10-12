import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import './providerBookings.css'

const tabs = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled']
const transitions = {
  Pending: ['Accepted', 'Rejected'],
  Accepted: ['Completed', 'Cancelled'],
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-')
}

function BookingDetails({ booking, onClose }) {
  if (!booking) return null
  const details = [
    ['Booking Reference', booking.id],
    ['Status', booking.status],
    ['Service', booking.service],
    ['Provider', booking.provider],
    ['Date', booking.date],
    ['Time', booking.time],
    ['Address', booking.address],
    ['Customer', booking.customerName],
    ['Customer Phone', booking.customerPhone],
    ['Amount', `₹${Number(booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Payment Status', booking.paymentStatus],
  ]

  return <div className="provider-bookings-modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <section aria-labelledby="provider-booking-details-title" aria-modal="true" className="provider-bookings-modal" role="dialog">
      <div className="provider-bookings-modal-head"><h2 id="provider-booking-details-title">Booking Details</h2><button aria-label="Close booking details" onClick={onClose} type="button">×</button></div>
      <div className="provider-bookings-detail-grid">{details.map(([label, value]) => <div className="provider-bookings-detail" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>
    </section>
  </div>
}

export function ProviderBookingsPage() {
  const { isAuthenticated, role } = useAuth()
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [pendingCancellation, setPendingCancellation] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(() => isAuthenticated && role === 'provider')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || role !== 'provider') return undefined
    let active = true
    bookingsApi.listForProvider()
      .then((records) => { if (active) setBookings(Array.isArray(records) ? records : []) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load incoming bookings.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [isAuthenticated, role])

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return bookings.filter((booking) => {
      const statusMatches = activeTab === 'All' || booking.status === activeTab
      const searchMatches = !normalizedQuery || [booking.id, booking.service, booking.customerName, booking.date, booking.time, booking.address, booking.status]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
      return statusMatches && searchMatches
    })
  }, [activeTab, bookings, query])

  async function updateStatus(booking, status) {
    if (updatingId || !transitions[booking.status]?.includes(status)) return
    setUpdatingId(booking.id)
    setActionError('')
    try {
      const updated = await bookingsApi.updateProviderStatus(booking.id, status, booking.stateVersion)
      setBookings((current) => current.map((item) => item.id === updated.id ? updated : item))
      setSelectedBooking((current) => current?.id === updated.id ? updated : current)
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to update this booking.')
      return false
    } finally {
      setUpdatingId(null)
    }
    return true
  }

  async function confirmCancellation() {
    if (!pendingCancellation) return
    const didUpdate = await updateStatus(pendingCancellation, 'Cancelled')
    if (didUpdate) setPendingCancellation(null)
  }

  if (!isAuthenticated || role !== 'provider') return <section className="provider-bookings-page"><div className="provider-bookings-feedback">Please sign in with a provider account to view incoming bookings.</div></section>

  return <section className="provider-bookings-page">
    <div className="provider-bookings-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link><span aria-hidden="true">›</span><strong>Incoming Bookings</strong></div>
    <div className="provider-bookings-title-row"><div><h1>Incoming Bookings</h1><p>Review and manage bookings assigned to your provider account.</p></div><Link className="provider-bookings-secondary-link" to="/provider/services">Manage Services</Link></div>
    {error && <div className="provider-bookings-feedback provider-bookings-feedback--error" role="alert">{error}</div>}
    {actionError && <div className="provider-bookings-feedback provider-bookings-feedback--error" role="alert">{actionError}</div>}
    <div className="provider-bookings-tabs" role="tablist" aria-label="Incoming booking status">
      {tabs.map((tab) => <button aria-selected={activeTab === tab} className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab} <span>{tab === 'All' ? bookings.length : bookings.filter((booking) => booking.status === tab).length}</span></button>)}
    </div>
    <label className="provider-bookings-search">Search loaded bookings<input onChange={(event) => setQuery(event.target.value)} placeholder="Search by service, customer, date, or status" value={query} /></label>
    {isLoading && <div className="provider-bookings-feedback">Loading incoming bookings…</div>}
    {!isLoading && !error && filteredBookings.length === 0 && <div className="provider-bookings-feedback">No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}bookings found.</div>}
    {!isLoading && !error && filteredBookings.length > 0 && <div className="provider-bookings-list">{filteredBookings.map((booking) => <article className="provider-booking-card" key={booking.id}>
      <div className="provider-booking-card-top"><div><h2>{booking.service}</h2><p>{booking.customerName || 'Customer'} · {booking.id}</p></div><span className={`provider-booking-status provider-booking-status--${statusClass(booking.status)}`}>{booking.status}</span></div>
      <div className="provider-booking-meta"><span>{booking.date}</span><span>{booking.time}</span><span>{booking.address}</span></div>
      <div className="provider-booking-card-bottom"><strong>₹{Number(booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong><div className="provider-booking-actions">
        {transitions[booking.status]?.map((status) => <button className={status === 'Rejected' || status === 'Cancelled' ? 'is-danger' : 'is-primary'} disabled={Boolean(updatingId)} key={status} onClick={() => status === 'Cancelled' ? setPendingCancellation(booking) : updateStatus(booking, status)} type="button">{updatingId === booking.id ? 'Updating…' : status}</button>)}
        <button className="is-secondary" onClick={() => setSelectedBooking(booking)} type="button">View Details</button>
      </div></div>
    </article>)}</div>}
    <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    {pendingCancellation && <div className="provider-bookings-modal-backdrop" role="presentation">
      <section aria-labelledby="provider-cancellation-title" aria-modal="true" className="provider-bookings-modal provider-bookings-confirmation" role="dialog">
        <div className="provider-bookings-modal-head"><h2 id="provider-cancellation-title">Cancel booking?</h2><button aria-label="Close cancellation dialog" onClick={() => setPendingCancellation(null)} type="button">×</button></div>
        <p>This will move booking <strong>{pendingCancellation.id}</strong> to Cancelled. Continue?</p>
        <div className="provider-bookings-confirmation-actions"><button className="is-danger" disabled={Boolean(updatingId)} onClick={confirmCancellation} type="button">{updatingId ? 'Updating…' : 'Confirm Cancellation'}</button><button className="is-secondary" disabled={Boolean(updatingId)} onClick={() => setPendingCancellation(null)} type="button">Keep Booking</button></div>
      </section>
    </div>}
  </section>
}
