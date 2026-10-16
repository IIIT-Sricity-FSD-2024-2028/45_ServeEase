import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import { formatDisplayDate } from '../../customer/customerOperations'
import { providerStatusPill } from '../providerStatus'
import '../providerPortal.css'

const tabs = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled']
const transitions = { Pending: ['Accepted', 'Rejected'], Accepted: ['Completed', 'Cancelled'] }
const normalizeStatus = (status) => String(status || 'Pending').trim().toLowerCase()
const statusLabel = (status) => String(status || 'Unavailable')
const statusProgress = (status) => ({ completed: 100, accepted: 70, rejected: 10, cancelled: 10, pending: 35 }[normalizeStatus(status)] ?? 35)
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (value) => (value ? formatDisplayDate(value) : 'Date unavailable')
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

function Row({ label, value }) {
  return value === undefined || value === null || value === '' ? null : <div className="info-row"><span>{label}:</span><span>{value}</span></div>
}

function BookingDetails({ booking, onClose }) {
  if (!booking) return null
  return <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><section aria-labelledby="provider-booking-details-title" aria-modal="true" className="modal-card booking-details-modal provider-booking-modal-card" role="dialog">
    <div className="modal-head"><h2 id="provider-booking-details-title">Booking Details</h2><button aria-label="Close booking details" className="close-modal-btn" onClick={onClose} type="button">×</button></div>
    <div className="modal-body"><div className="info-grid">
      <div className="info-box"><strong>Booking Information</strong><Row label="Booking Reference" value={booking.id} /><div className="info-row"><span>Status:</span><span className={`status-pill ${providerStatusPill(booking.status)}`}>{statusLabel(booking.status)}</span></div><Row label="Cancellation Reason" value={booking.cancellationReason} /><Row label="Progress" value={`${statusProgress(booking.status)}%`} /></div>
      <div className="info-box"><strong>Customer Information</strong><Row label="Name" value={booking.customerName} /><Row label="Phone" value={booking.customerPhone} /><Row label="Location" value={booking.address || booking.location} /></div>
      <div className="info-box"><strong>Service Information</strong><Row label="Service" value={booking.service} /><Row label="Date" value={formatDate(booking.date)} /><Row label="Time" value={booking.time} /><Row label="Amount" value={formatMoney(booking.amount)} /><Row label="Payment Status" value={booking.paymentStatus} /></div>
    </div></div>
  </section></div>
}

export function ProviderBookingsPage() {
  const { isAuthenticated, role } = useAuth()
  const [bookings, setBookings] = useState([]); const [activeTab, setActiveTab] = useState('All'); const [selectedBooking, setSelectedBooking] = useState(null); const [pendingCancellation, setPendingCancellation] = useState(null); const [isLoading, setIsLoading] = useState(() => isAuthenticated && role === 'provider'); const [error, setError] = useState(''); const [actionError, setActionError] = useState(''); const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || role !== 'provider') return undefined
    let active = true
    bookingsApi.listForProvider().then((records) => { if (active) setBookings(Array.isArray(records) ? records : []) }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load incoming bookings.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [isAuthenticated, role])

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab, tab === 'All' ? bookings.length : bookings.filter((booking) => normalizeStatus(booking.status) === normalizeStatus(tab)).length])), [bookings])
  const filteredBookings = useMemo(() => bookings.filter((booking) => activeTab === 'All' || normalizeStatus(booking.status) === normalizeStatus(activeTab)), [activeTab, bookings])

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

  if (!isAuthenticated || role !== 'provider') return <section className="provider-portal"><div className="panel-card ops-state">Please sign in with a provider account to view booking management.</div></section>

  return <section className="provider-portal">
    <div className="breadcrumb-row"><Link to="/provider/dashboard">Provider Dashboard</Link> &nbsp;›&nbsp; <strong>Booking Management</strong></div>
    <section className="page-title-block provider-page-title"><h1>Booking Management</h1><p>View all booking requests, accept or reject requests, and track service progress.</p></section>
    {error && <div className="panel-card ops-state ops-state--error" role="alert">{error}</div>}{actionError && <div className="panel-card ops-state ops-state--error" role="alert">{actionError}</div>}
    <section className="tabs-row" id="providerBookingTabs" role="tablist" aria-label="Booking status filters">{tabs.map((tab) => <button aria-selected={activeTab === tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab} <span>{counts[tab]}</span></button>)}</section>
    <section className="panel-card">
      <div id="providerBookingsList">
        {isLoading && <div className="superuser-empty-state">Loading booking requests…</div>}
        {!isLoading && !error && filteredBookings.length === 0 && <div className="superuser-empty-state">No {activeTab === 'All' ? '' : `${activeTab.toLowerCase()} `}bookings found.</div>}
        {!isLoading && !error && filteredBookings.map((booking) => { const status = statusLabel(booking.status); const normalized = normalizeStatus(status); const completeAllowed = canComplete(booking); return <div className="provider-booking-card" key={booking.id}>
          <div className="provider-booking-top"><div><div className="provider-booking-title">{booking.service || 'Service unavailable'}</div><div className="provider-booking-submeta">{booking.customerName || 'Customer unavailable'} • {booking.id || 'Reference unavailable'}</div></div><span className={`status-pill ${providerStatusPill(status)}`}>{status}</span></div>
          <div className="provider-booking-line">📅 {formatDate(booking.date)} &nbsp; • &nbsp; 🕒 {booking.time || 'Time unavailable'}</div>
          <div className="provider-booking-line">📍 {booking.address || booking.location || 'Location unavailable'}</div>
          <div className="provider-booking-line">Amount: <strong>{formatMoney(booking.amount)}</strong></div>
          <div aria-label={`Booking progress ${statusProgress(status)} percent`} className="provider-booking-progress"><span style={{ width: `${statusProgress(status)}%` }} /></div>
          <div className="provider-booking-actions">
            {normalized === 'pending' && <><button className="btn btn-primary" disabled={Boolean(updatingId)} onClick={() => updateStatus(booking, 'Accepted')} type="button">{updatingId === booking.id ? 'Updating…' : 'Accept'}</button><button className="danger-action" disabled={Boolean(updatingId)} onClick={() => updateStatus(booking, 'Rejected')} type="button">Reject</button></>}
            {normalized === 'accepted' && <><button className="secondary-action" disabled={Boolean(updatingId) || !completeAllowed} onClick={() => updateStatus(booking, 'Completed')} title={completeAllowed ? 'Mark this completed' : 'Available 30 minutes after the scheduled service start time.'} type="button">Mark Completed</button><button className="danger-action" disabled={Boolean(updatingId)} onClick={() => setPendingCancellation(booking)} type="button">Cancel Booking</button></>}
            <button className="secondary-action" onClick={() => setSelectedBooking(booking)} type="button">View Details</button>
          </div></div> })}
      </div>
    </section>
    <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    {pendingCancellation && <div className="modal-backdrop" role="presentation"><section aria-labelledby="provider-cancellation-title" aria-modal="true" className="modal-card booking-details-modal provider-booking-modal-card" role="dialog"><div className="modal-head"><h2 id="provider-cancellation-title">Booking Details</h2><button aria-label="Close cancellation dialog" className="close-modal-btn" onClick={() => setPendingCancellation(null)} type="button">×</button></div><div className="modal-body"><div className="info-box"><strong>Cancel Booking</strong><p>This will cancel the booking and issue the customer a full refund of the amount paid.</p><div className="provider-booking-actions"><button className="danger-action" disabled={Boolean(updatingId)} onClick={confirmCancellation} type="button">{updatingId ? 'Updating…' : 'Confirm Cancellation'}</button><button className="secondary-action" disabled={Boolean(updatingId)} onClick={() => setPendingCancellation(null)} type="button">Keep Booking</button></div></div></div></section></div>}
  </section>
}
