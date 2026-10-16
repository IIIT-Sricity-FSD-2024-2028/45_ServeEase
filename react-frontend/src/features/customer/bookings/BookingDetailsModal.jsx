import { useEffect, useState } from 'react'
import { bookingsApi } from '../../../services/api'
import { InfoRow, LoadState, OpsModal } from '../CustomerOpsParts'
import { bookingTotal, formatDisplayDate, formatDisplayDateTime, formatPrice, hasValue, statusPillClass } from '../customerOperations'

// openBookingModal() from customer.js. The booking is re-read with GET /bookings/:id so a deep link or
// refresh shows the server copy (the API answers 404 for bookings that are not the caller's). The
// original's hard-coded provider phone number is not reproduced; payment status is shown on its own.
export function BookingDetailsModal({ bookingId, fallback, onClose }) {
  const [result, setResult] = useState({ id: '', booking: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    bookingsApi.get(bookingId)
      .then((booking) => { if (active) setResult({ id: bookingId, booking, error: '' }) })
      .catch((error) => { if (active) setResult({ id: bookingId, booking: null, error: error.message || 'Booking details could not be loaded.' }) })
    return () => { active = false }
  }, [attempt, bookingId])

  const loaded = result.id === bookingId
  const booking = (loaded && result.booking) || (!loaded ? fallback : null)

  return <OpsModal className="booking-details-modal" labelId="booking-details-title" onClose={onClose} title="Booking Details">
    {!booking && <LoadState error={result.error} loadingText="Loading booking details…" onRetry={() => setAttempt((count) => count + 1)} state={loaded ? 'error' : 'loading'} />}
    {booking && <div className="info-grid">
      <div className="info-box"><strong>Service Information</strong>
        <InfoRow label="Service Name:">{booking.service}</InfoRow>
        <InfoRow label="Provider Name:">{booking.provider}</InfoRow>
        <InfoRow label="Booking Reference:">{booking.id}</InfoRow>
        <InfoRow label="Category:">{booking.category}</InfoRow>
        <InfoRow label="Status:"><span className={`status-pill ${statusPillClass(booking.status)}`}>{booking.status}</span></InfoRow>
        {hasValue(booking.cancelledAt) && <InfoRow label="Cancelled On:">{formatDisplayDateTime(booking.cancelledAt)}</InfoRow>}
        {hasValue(booking.cancellationActor) && <InfoRow label="Cancelled By:">{booking.cancellationActor}</InfoRow>}
        {hasValue(booking.cancellationReason) && <InfoRow label="Cancellation Reason:">{booking.cancellationReason}</InfoRow>}
        {hasValue(booking.cancellationPolicy) && <InfoRow label="Cancellation Policy:">{booking.cancellationPolicy}</InfoRow>}
        {hasValue(booking.refundAmount) && <InfoRow label="Refund Amount:">{formatPrice(booking.refundAmount)}</InfoRow>}
        {hasValue(booking.refundStatus) && <InfoRow label="Refund Status:">{booking.refundStatus}</InfoRow>}
      </div>
      <div className="info-box"><strong>Date &amp; Time</strong>
        <InfoRow label="Date:">{formatDisplayDate(booking.date)}</InfoRow>
        <InfoRow label="Time:">{booking.time || 'Not provided'}</InfoRow>
      </div>
      <div className="info-box"><strong>Service Address</strong><div>{booking.address || 'Not provided'}</div></div>
      <div className="info-box"><strong>Payment</strong>
        <InfoRow label="Total Amount:">{formatPrice(bookingTotal(booking))}</InfoRow>
        <InfoRow label="Payment Status:">{hasValue(booking.paymentStatus) ? <span className={`status-pill ${statusPillClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span> : 'Not provided'}</InfoRow>
        {hasValue(booking.paymentMethod) && <InfoRow label="Payment Method:">{booking.paymentMethod}</InfoRow>}
        {hasValue(booking.paymentId) && <InfoRow label="Transaction ID:">{booking.paymentId}</InfoRow>}
        {hasValue(booking.paymentDate) && <InfoRow label="Payment Date:">{formatDisplayDate(booking.paymentDate)}</InfoRow>}
      </div>
      {booking.status === 'Completed' && <div className="info-box"><strong>Customer Review</strong><div>Ratings and reviews are not supported by the ServeEase backend yet.</div></div>}
    </div>}
  </OpsModal>
}
