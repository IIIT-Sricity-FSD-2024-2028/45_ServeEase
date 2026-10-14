import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import './providerBookings.css'

const tabs = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled']
const transitions = { Pending: ['Accepted', 'Rejected'], Accepted: ['Completed', 'Cancelled'] }
const normalizeStatus = (status) => String(status || 'Pending').trim().toLowerCase()
const statusLabel = (status) => String(status || 'Unavailable')
const statusProgress = (status) => ({ completed: 100, accepted: 70, rejected: 10, cancelled: 10, pending: 35 }[normalizeStatus(status)] ?? 35)
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function formatDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value || 'Date unavailable' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function completionAvailableAt(booking) {
  const date = new Date(`${String(booking?.date || '').slice(0, 10)}T00:00:00`)
  const match = String(booking?.time || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i)
  if (Number.isNaN(date.getTime()) || !match) return null
  let hour = Number(match[1]); const minute = Number(match[2]); const meridiem = String(match[3] || '').toUpperCase()
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  date.setHours(hour, minute, 0, 0)
  return new Date(date.getTime() + 30 * 60 * 1000)
}

function canComplete(booking) {
  const availableAt = completionAvailableAt(booking)
  return Boolean(availableAt && Date.now() >= availableAt.getTime())
}

function BookingDetails({ booking, onClose }) {
  if (!booking) return null
  const details = [
    ['Booking Reference', booking.id], ['Status', statusLabel(booking.status)], ['Progress', `${statusProgress(booking.status)}%`],
    ['Service', booking.service], ['Provider', booking.provider], ['Date', formatDate(booking.date)], ['Time', booking.time],
    ['Location', booking.address || booking.location], ['Customer', booking.customerName], ['Customer Phone', booking.customerPhone],
    ['Amount', formatMoney(booking.amount)], ['Payment Status', booking.paymentStatus], ['Cancellation Reason', booking.cancellationReason],
  ]
  return <div className="provider-bookings-modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><section aria-labelledby="provider-booking-details-title" aria-modal="true" className="provider-bookings-modal" role="dialog"><div className="provider-bookings-modal-head"><h2 id="provider-booking-details-title">Booking Details</h2><button aria-label="Close booking details" onClick={onClose} type="button">×</button></div><div className="provider-bookings-detail-grid">{details.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <div className="provider-bookings-detail" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></div>
}

export function ProviderBookingsPage() {
  const { isAuthenticated, role } = useAuth()
  const [bookings, setBookings] = useState([]); const [activeTab, setActiveTab] = useState('All'); const [selectedBooking, setSelectedBooking] = useState(null); const [pendingCancellation, setPendingCancellation] = useState(null); const [query, setQuery] = useState(''); const [isLoading, setIsLoading] = useState(() => isAuthenticated && role === 'provider'); const [error, setError] = useState(''); const [actionError, setActionError] = useState(''); const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || role !== 'provider') return undefined
    let active = true
    bookingsApi.listForProvider().then((records) => { if (active) setBookings(Array.isArray(records) ? records : []) }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load incoming bookings.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [isAuthenticated, role])

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab, tab === 'All' ? bookings.length : bookings.filter((booking) => normalizeStatus(booking.status) === normalizeStatus(tab)).length])), [bookings])
  const filteredBookings = useMemo(() => { const normalizedQuery = query.trim().toLowerCase(); return bookings.filter((booking) => (activeTab === 'All' || normalizeStatus(booking.status) === normalizeStatus(activeTab)) && (!normalizedQuery || [booking.id, booking.service, booking.customerName, booking.date, booking.time, booking.address || booking.location, booking.status].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)))) }, [activeTab, bookings, query])

  async function updateStatus(booking, nextStatus) {
    const currentStatus = statusLabel(booking.status).replace(/^./, (character) => character.toUpperCase())
    if (updatingId || !transitions[currentStatus]?.includes(nextStatus)) return false
    setUpdatingId(booking.id); setActionError('')
    try {
      const updated = await bookingsApi.updateProviderStatus(booking.id, nextStatus, booking.stateVersion)
      setBookings((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelectedBooking((current) => current?.id === updated.id ? updated : current); return true
    } catch (requestError) { setActionError(requestError.message || 'Unable to update this booking.'); return false } finally { setUpdatingId(null) }
  }

  async function confirmCancellation() { if (pendingCancellation && await updateStatus(pendingCancellation, 'Cancelled')) setPendingCancellation(null) }

  if (!isAuthenticated || role !== 'provider') return <section className="provider-bookings-page"><div className="provider-bookings-feedback">Please sign in with a provider account to view booking management.</div></section>

  return <section className="provider-bookings-page">
    <div className="provider-bookings-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link><span aria-hidden="true">›</span><strong>Booking Management</strong></div>
    <div className="provider-bookings-title-row"><div><h1>Booking Management</h1><p>View all booking requests, accept or reject requests, and track service progress.</p></div><Link className="provider-bookings-secondary-link" to="/provider/services">Manage Services</Link></div>
    {error && <div className="provider-bookings-feedback provider-bookings-feedback--error" role="alert">{error}</div>}{actionError && <div className="provider-bookings-feedback provider-bookings-feedback--error" role="alert">{actionError}</div>}
    <div className="provider-bookings-tabs" role="tablist" aria-label="Booking status filters">{tabs.map((tab) => <button aria-selected={activeTab === tab} className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab} <span>{counts[tab]}</span></button>)}</div>
    <label className="provider-bookings-search">Search bookings<input onChange={(event) => setQuery(event.target.value)} placeholder="Search by service, customer, date, or status" value={query} /></label>
    <section className="provider-bookings-panel">
      {isLoading && <div className="provider-bookings-feedback">Loading booking requests…</div>}
      {!isLoading && !error && filteredBookings.length === 0 && <div className="provider-bookings-feedback">No {activeTab === 'All' ? '' : `${activeTab.toLowerCase()} `}bookings found.</div>}
      {!isLoading && !error && filteredBookings.length > 0 && <div className="provider-bookings-list">{filteredBookings.map((booking) => { const status = statusLabel(booking.status); const normalized = normalizeStatus(status); const completeAllowed = canComplete(booking); return <article className="provider-booking-card" key={booking.id}><div className="provider-booking-top"><div><h2 className="provider-booking-title">{booking.service || 'Service unavailable'}</h2><p className="provider-booking-submeta">{booking.customerName || 'Customer unavailable'} · {booking.id || 'Reference unavailable'}</p></div><span className={`provider-booking-status provider-booking-status--${normalized}`}>{status}</span></div><div className="provider-booking-line">📅 {formatDate(booking.date)} <span aria-hidden="true">·</span> 🕒 {booking.time || 'Time unavailable'}</div><div className="provider-booking-line">📍 {booking.address || booking.location || 'Location unavailable'}</div><div className="provider-booking-line">Amount: <strong>{formatMoney(booking.amount)}</strong></div><div aria-label={`Booking progress ${statusProgress(status)} percent`} className="provider-booking-progress"><span style={{ width: `${statusProgress(status)}%` }} /></div><div className="provider-booking-actions">{normalized === 'pending' && <><button className="is-primary" disabled={Boolean(updatingId)} onClick={() => updateStatus(booking, 'Accepted')} type="button">{updatingId === booking.id ? 'Updating…' : 'Accept'}</button><button className="is-danger" disabled={Boolean(updatingId)} onClick={() => updateStatus(booking, 'Rejected')} type="button">Reject</button></>}{normalized === 'accepted' && <><button className="is-secondary" disabled={Boolean(updatingId) || !completeAllowed} onClick={() => updateStatus(booking, 'Completed')} title={completeAllowed ? 'Mark this completed' : 'Available 30 minutes after the scheduled service start time.'} type="button">Mark Completed</button><button className="is-danger" disabled={Boolean(updatingId)} onClick={() => setPendingCancellation(booking)} type="button">Cancel Booking</button></>}<button className="is-secondary" onClick={() => setSelectedBooking(booking)} type="button">View Details</button></div></article> })}</div>}
    </section>
    <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    {pendingCancellation && <div className="provider-bookings-modal-backdrop" role="presentation"><section aria-labelledby="provider-cancellation-title" aria-modal="true" className="provider-bookings-modal provider-bookings-confirmation" role="dialog"><div className="provider-bookings-modal-head"><h2 id="provider-cancellation-title">Cancel Booking</h2><button aria-label="Close cancellation dialog" onClick={() => setPendingCancellation(null)} type="button">×</button></div><p>This will cancel the booking and issue the customer a full refund of the amount paid.</p><div className="provider-bookings-confirmation-actions"><button className="is-danger" disabled={Boolean(updatingId)} onClick={confirmCancellation} type="button">{updatingId ? 'Updating…' : 'Confirm Cancellation'}</button><button className="is-secondary" disabled={Boolean(updatingId)} onClick={() => setPendingCancellation(null)} type="button">Keep Booking</button></div></section></div>}
  </section>
}
