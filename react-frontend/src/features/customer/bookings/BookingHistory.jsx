function statusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-')
}

export function BookingHistory({ bookings, onViewDetails, onRaiseTicket }) {
  return <div className="customer-booking-table-wrap">
    <table className="customer-booking-table">
      <thead><tr><th>Service</th><th>Provider</th><th>Date</th><th>Amount Paid</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{bookings.length ? bookings.map((booking) => <tr key={booking.id}>
        <td>{booking.service}</td><td>{booking.provider}</td><td>{booking.date}</td>
        <td>₹{Number(booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>{booking.id}</td><td><span className={`customer-booking-status customer-booking-status--${statusClass(booking.status)}`}>{booking.status}</span></td>
        <td><button className="customer-booking-table-link" type="button" onClick={() => onViewDetails(booking)}>View</button>{' '}<button className="customer-booking-table-link" type="button" onClick={() => onRaiseTicket(booking)}>Raise Ticket</button></td>
      </tr>) : <tr><td colSpan="7">No bookings found.</td></tr>}</tbody>
    </table>
  </div>
}

