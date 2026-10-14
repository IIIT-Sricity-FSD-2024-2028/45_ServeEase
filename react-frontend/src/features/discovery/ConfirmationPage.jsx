import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { bookingsApi } from '../../services/api'
import { formatCurrency, formatDisplayDate, formatSlot } from './catalogModel'
import { readJourney } from './journeyState'
import './journey.css'

// Shows the booking returned by POST /bookings/customer; after a refresh it is re-read with
// GET /bookings/:id so the page never displays details the API did not confirm.
export function ConfirmationPage() {
  const [params] = useSearchParams()
  const bookingId = params.get('booking') || ''
  const saved = readJourney()?.booked
  const fromJourney = saved?.booking?.id === bookingId ? saved.booking : null
  const [state, setState] = useState(() => (fromJourney ? { loading: false, booking: fromJourney, error: '' } : { loading: Boolean(bookingId), booking: null, error: '' }))

  useEffect(() => {
    if (!bookingId || fromJourney) return undefined
    let live = true
    bookingsApi.get(bookingId)
      .then((booking) => live && setState({ loading: false, booking, error: '' }))
      .catch((error) => live && setState({ loading: false, booking: null, error: error.message }))
    return () => { live = false }
  }, [bookingId, fromJourney])

  const booking = state.booking
  let content
  if (state.loading) content = <p role="status">Loading booking…</p>
  else if (!booking) content = <>
    <h1>Booking not found</h1>
    <p className="success-subtext">{state.error || 'There is no recently created booking to display.'}</p>
    <div className="success-actions">
      <Link className="btn btn-primary btn-full" to="/customer/bookings">View My Bookings</Link>
      <Link className="secondary-btn success-secondary-btn" to="/services">Browse Services</Link>
    </div>
  </>
  else {
    const status = booking.status || 'Pending'
    const pending = status.toLowerCase() === 'pending'
    content = <>
      <div className="success-icon-wrap">⌛</div>
      <h1>Booking Request Submitted!</h1>
      <p className="success-subtext">
        Your booking request is currently <strong>{status.toLowerCase()}</strong>{pending ? ' confirmation' : ''}.<br />
        The service provider will review and accept your booking. You will be notified once it's confirmed.
      </p>

      {pending && <div className="awaiting-box">
        <strong>🕒 Awaiting Provider Confirmation</strong>
        <span>Your booking request has been sent successfully. The provider must confirm it before your scheduled service date. You'll be notified once it is accepted or rejected.</span>
      </div>}

      <div className="success-info-card">
        <div className="checkout-info-row"><span>Booking Reference</span><strong className="highlight-text">{booking.id}</strong></div>
        <div className="checkout-info-row"><span>Status</span><strong className="pending-pill">{pending ? '⌛ ' : ''}{status}</strong></div>
        <div className="checkout-info-row"><span>Service</span><strong>{booking.service}</strong></div>
        <div className="checkout-info-row"><span>Provider</span><strong>{booking.provider}</strong></div>
        <div className="checkout-info-row"><span>Date</span><strong>{formatDisplayDate(booking.date)}</strong></div>
        <div className="checkout-info-row"><span>Time</span><strong>{formatSlot(booking.time)}</strong></div>
        <div className="checkout-info-row"><span>Payment Status</span><strong>{booking.paymentStatus || 'Pending'}</strong></div>
        <div className="checkout-total-row compact"><span>Total Amount</span><strong>{formatCurrency(booking.customerTotal ?? booking.amount)}</strong></div>
      </div>

      <div className="next-steps-box">
        <h3>ⓘ What happens next?</h3>
        <ul>
          <li>Service provider will review your booking request</li>
          <li>You'll receive a notification once it's confirmed</li>
          <li>Payment will be processed after confirmation</li>
          <li>You can track status in "My Bookings" section</li>
        </ul>
      </div>

      <div className="success-actions">
        <Link className="btn btn-primary btn-full" to="/customer/bookings">View My Bookings</Link>
        <Link className="secondary-btn success-secondary-btn" to="/customer/dashboard">Back to Dashboard</Link>
      </div>
    </>
  }

  return <div className="se-journey">
    <main className="booking-success-page">
      <div className="booking-success-card">{content}</div>
    </main>
  </div>
}
