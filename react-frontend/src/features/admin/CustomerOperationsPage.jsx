import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { listBookings } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

function customerKey(booking, index) {
  const candidates = [
    ['id', booking.customerId],
    ['email', booking.customerEmail],
    ['phone', booking.customerPhone],
    ['name', booking.customerName],
  ]
  const [kind, value] = candidates.find(([, candidate]) => candidate !== null && candidate !== undefined && String(candidate).trim()) || []
  return kind ? `${kind}:${String(value).trim().toLocaleLowerCase()}` : `booking:${index}`
}

function deriveCustomers(bookings) {
  const customers = new Map()
  bookings.forEach((booking, index) => {
    const key = customerKey(booking, index)
    const current = customers.get(key) || {
      id: booking.customerId,
      name: booking.customerName,
      email: booking.customerEmail,
      phone: booking.customerPhone,
      bookingCount: 0,
      lastBookingDate: null,
    }
    current.id = current.id || booking.customerId
    current.name = current.name || booking.customerName
    current.email = current.email || booking.customerEmail
    current.phone = current.phone || booking.customerPhone
    current.bookingCount += 1

    const bookingDate = booking.date || booking.bookingDate
    const dateTime = bookingDate ? Date.parse(bookingDate) : Number.NaN
    const currentDateTime = current.lastBookingDate ? Date.parse(current.lastBookingDate) : Number.NaN
    if (Number.isFinite(dateTime) && (!Number.isFinite(currentDateTime) || dateTime > currentDateTime)) {
      current.lastBookingDate = bookingDate
    }
    customers.set(key, current)
  })
  return Array.from(customers.values())
}

export default function CustomerOperationsPage() {
  const { data, isLoading, error, reload } = useAdminData(listBookings)
  const [query, setQuery] = useState('')
  const customers = useMemo(() => deriveCustomers(Array.isArray(data) ? data : []), [data])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredCustomers = customers.filter((customer) => [customer.name, customer.email, customer.phone, customer.id]
    .some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(normalizedQuery)))

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Customers</h1>
        <p className="admin-muted">Derived from booking records; not a full customer account directory.</p>

        <div className="admin-panel">
          <label className="admin-form">
            Search customers
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, or ID" value={query} />
          </label>

          {isLoading && <LoadingState message="Loading customers from bookings…" />}
          {!isLoading && error && <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>}
          {!isLoading && !error && customers.length === 0 && <EmptyState message="No booking records are available to derive customers." />}
          {!isLoading && !error && customers.length > 0 && filteredCustomers.length === 0 && <EmptyState message="No customers match this search." />}
          {!isLoading && !error && filteredCustomers.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Customer ID</th><th>Bookings</th><th>Last booking</th><th>Account status</th></tr></thead>
                <tbody>{filteredCustomers.map((customer) => (
                  <tr key={`${customer.id || customer.email || customer.phone || customer.name || 'customer'}-${customer.email || customer.phone || ''}`}>
                    <td>{show(customer.name)}</td>
                    <td>{show(customer.email)}</td>
                    <td>{show(customer.phone)}</td>
                    <td>{show(customer.id)}</td>
                    <td>{customer.bookingCount}</td>
                    <td>{show(customer.lastBookingDate)}</td>
                    <td>Not available</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminAccessGate>
  )
}
