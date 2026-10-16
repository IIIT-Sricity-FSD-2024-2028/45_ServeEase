import { bookingTotal, canCustomerCancel, formatDisplayDate, formatPrice, statusPillClass } from '../customerOperations'

// Upcoming booking card from initMyBookings(): View Details, Raise Ticket and, while the backend
// still allows it (Pending/Accepted), Cancel.
export function BookingCard({ booking, onViewDetails, onRaiseTicket, onCancel }) {
  const cancellable = canCustomerCancel(booking)
  return <article className="booking-card-customer">
    <div className="booking-card-top">
      <div><h3>{booking.service}</h3><div className="booking-provider">{booking.provider}</div></div>
      <span className={`status-pill ${statusPillClass(booking.status)}`}>{booking.status}</span>
    </div>
    <div className="booking-info-line">📅 {formatDisplayDate(booking.date)}</div>
    <div className="booking-info-line">🕒 {booking.time || 'Not provided'}</div>
    <div className="booking-info-line">📍 {booking.address || 'Not provided'}</div>
    <div className="booking-bottom-row">
      <div className="booking-ref">{booking.id}</div>
      <div className="booking-price">{formatPrice(bookingTotal(booking))}</div>
    </div>
    <div className={`booking-actions${cancellable ? '' : ' booking-actions--two'}`}>
      <button className="secondary-action" onClick={() => onViewDetails(booking)} type="button">View Details</button>
      <button className="secondary-action" onClick={() => onRaiseTicket(booking)} type="button">Raise Ticket</button>
      {cancellable && <button className="danger-action" onClick={() => onCancel(booking)} type="button">Cancel</button>}
    </div>
  </article>
}
