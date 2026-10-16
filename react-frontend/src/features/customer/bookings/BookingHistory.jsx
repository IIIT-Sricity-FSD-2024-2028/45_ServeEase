import { bookingTotal, formatDisplayDate, formatPrice, statusPillClass } from '../customerOperations'
import { ReviewRating } from '../../reviews/ReviewParts'


// "Past Booking History" table (.table-card / .data-table) from my-bookings.html.
export function BookingHistory({ bookings, emptyLabel, reviews = {}, onRate, onViewDetails, onRaiseTicket }) {
  return <div className="table-card table-scroll">
    <table className="data-table">
      <thead><tr>
        <th scope="col">Service</th><th scope="col">Provider</th><th scope="col">Date</th><th scope="col">Amount Paid</th>
        <th scope="col">Reference</th><th scope="col">Status</th><th scope="col">Rating &amp; Feedback</th><th scope="col">Actions</th>
      </tr></thead>
      <tbody>{bookings.length ? bookings.map((booking) => <tr key={booking.id}>
        <td>{booking.service}</td>
        <td>{booking.provider}</td>
        <td>{formatDisplayDate(booking.date)}</td>
        <td>{formatPrice(bookingTotal(booking))}</td>
        <td>{booking.id}</td>
        <td><span className={`status-pill ${statusPillClass(booking.status)}`}>{booking.status}</span></td>
        <td>{booking.status === 'Completed'
          ? reviews[booking.id]
            ? <div className="booking-review-cell"><ReviewRating rating={reviews[booking.id].rating} /><button className="table-link-btn edit-review-btn" onClick={() => onRate(booking)} type="button">Edit Review</button></div>
            : <button className="table-link-btn" onClick={() => onRate(booking)} type="button">⭐ Rate Service</button>
          : '—'}</td>
        <td>
          <button className="table-link-btn" onClick={() => onViewDetails(booking)} type="button">View</button>
          <button className="table-link-btn" onClick={() => onRaiseTicket(booking)} type="button">Raise Ticket</button>
        </td>
      </tr>) : <tr><td colSpan="8">{emptyLabel}</td></tr>}</tbody>
    </table>
  </div>
}
