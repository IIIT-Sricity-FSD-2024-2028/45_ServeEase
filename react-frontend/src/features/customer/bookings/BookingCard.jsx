function statusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-')
}

export function BookingCard({ booking, onViewDetails, onRaiseTicket }) {
  return <article className="customer-booking-card">
    <div className="customer-booking-card__top">
      <div><h3>{booking.service}</h3><div className="customer-booking-provider">{booking.provider}</div></div>
      <span className={`customer-booking-status customer-booking-status--${statusClass(booking.status)}`}>{booking.status}</span>
    </div>
    <div className="customer-booking-info">📅 {booking.date}</div>
    <div className="customer-booking-info">🕒 {booking.time}</div>
    <div className="customer-booking-info">📍 {booking.address}</div>
    <div className="customer-booking-card__bottom">
      <div className="customer-booking-reference">{booking.id}</div>
      <div className="customer-booking-price">₹{Number(booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div className="customer-booking-actions">
      <button className="customer-booking-action" type="button" onClick={() => onViewDetails(booking)}>View Details</button>
      <button className="customer-booking-action" type="button" onClick={() => onRaiseTicket(booking)}>Raise Ticket</button>
    </div>
  </article>
}

