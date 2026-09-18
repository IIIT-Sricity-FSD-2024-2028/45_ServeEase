function Detail({ label, value }) {
  return <div className="customer-booking-detail-row"><span>{label}</span><span>{value || '—'}</span></div>
}

export function BookingDetailsModal({ booking, onClose }) {
  if (!booking) return null
  return <div className="customer-booking-modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <section className="customer-booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title">
      <div className="customer-booking-modal__head"><h2 id="booking-details-title">Booking Details</h2><button type="button" aria-label="Close booking details" onClick={onClose}>×</button></div>
      <div className="customer-booking-detail-grid">
        <div className="customer-booking-info-box"><strong>Service Information</strong><Detail label="Service Name:" value={booking.service} /><Detail label="Provider Name:" value={booking.provider} /><Detail label="Booking Reference:" value={booking.id} /><Detail label="Status:" value={booking.status} /><Detail label="Category:" value={booking.category} /></div>
        <div className="customer-booking-info-box"><strong>Date &amp; Time</strong><Detail label="Date:" value={booking.date} /><Detail label="Time:" value={booking.time} /></div>
        <div className="customer-booking-info-box"><strong>Service Address</strong><div>{booking.address || '—'}</div></div>
        <div className="customer-booking-info-box"><strong>Payment</strong><Detail label="Amount:" value={`₹${Number(booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} /><Detail label="Payment Status:" value={booking.paymentStatus} /><Detail label="Payment Method:" value={booking.paymentMethod} /></div>
      </div>
    </section>
  </div>
}

