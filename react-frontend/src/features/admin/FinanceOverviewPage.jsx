import { useMemo } from 'react'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { listBookings } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

function numericValue(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function sumField(bookings, field) {
  const values = bookings.map((booking) => numericValue(booking[field])).filter((value) => value !== null)
  return { sum: values.reduce((total, value) => total + value, 0), count: values.length }
}

function sumPayout(bookings) {
  const values = bookings.map((booking) => numericValue(booking.providerPayoutAmount ?? booking.providerPayout))
    .filter((value) => value !== null)
  return { sum: values.reduce((total, value) => total + value, 0), count: values.length }
}

function groupPayments(bookings) {
  const groups = new Map()
  bookings.forEach((booking) => {
    const status = show(booking.paymentStatus)
    const group = groups.get(status) || { status, count: 0, amountSum: 0, amountCount: 0 }
    group.count += 1
    const amount = numericValue(booking.amount)
    if (amount !== null) {
      group.amountSum += amount
      group.amountCount += 1
    }
    groups.set(status, group)
  })
  return Array.from(groups.values())
}

export default function FinanceOverviewPage() {
  const { data, isLoading, error, reload } = useAdminData(listBookings)
  const bookings = useMemo(() => Array.isArray(data) ? data : [], [data])
  const summary = useMemo(() => [
    { label: 'Amount', field: 'amount', ...sumField(bookings, 'amount') },
    { label: 'Customer total', field: 'customerTotal', ...sumField(bookings, 'customerTotal') },
    { label: 'Platform revenue amount', field: 'platformRevenueAmount', ...sumField(bookings, 'platformRevenueAmount') },
    { label: 'Provider payout', field: 'providerPayoutAmount (or providerPayout)', ...sumPayout(bookings) },
    { label: 'Refund amount', field: 'refundAmount', ...sumField(bookings, 'refundAmount') },
  ], [bookings])
  const paymentGroups = useMemo(() => groupPayments(bookings), [bookings])

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Finance overview</h1>
        <p className="admin-muted">No dedicated finance endpoint exists. This read-only overview uses booking records only.</p>

        {isLoading && <LoadingState message="Loading booking finance data…" />}
        {!isLoading && error && <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>}
        {!isLoading && !error && bookings.length === 0 && <EmptyState message="No booking records are available." />}
        {!isLoading && !error && bookings.length > 0 && <>
          <div className="admin-grid">
            {summary.map((item) => (
              <article className="admin-card" key={item.field}>
                <h2>{item.label}</h2>
                <p><strong>{item.count > 0 ? money(item.sum) : 'Not available'}</strong></p>
                <p className="admin-muted">Sum of {item.field}. Based on {item.count} of {bookings.length} booking records that contain this field.</p>
              </article>
            ))}
          </div>

          <section className="admin-panel">
            <h2>Payment status summary</h2>
            {paymentGroups.length === 0 && <EmptyState message="No payment status records are available." />}
            {paymentGroups.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Payment status</th><th>Bookings</th><th>Sum of amount</th></tr></thead>
              <tbody>{paymentGroups.map((group) => <tr key={group.status}>
                <td>{group.status}</td><td>{group.count}</td><td>{group.amountCount > 0 ? money(group.amountSum) : 'Not available'}</td>
              </tr>)}</tbody>
            </table></div>}
          </section>

          <section className="admin-panel">
            <h2>Booking records</h2>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>ID</th><th>Customer</th><th>Provider</th><th>Payment status</th><th>Amount</th><th>Payout</th><th>Payout status</th><th>Refund</th></tr></thead>
              <tbody>{bookings.map((booking, index) => <tr key={booking.id ?? `booking-${index}`}>
                <td>{show(booking.id)}</td>
                <td>{show(booking.customerName || booking.customerEmail || booking.customerId)}</td>
                <td>{show(booking.provider || booking.providerId)}</td>
                <td>{show(booking.paymentStatus)}</td>
                <td>{numericValue(booking.amount) === null ? 'Not available' : money(numericValue(booking.amount))}</td>
                <td>{numericValue(booking.providerPayoutAmount ?? booking.providerPayout) === null ? 'Not available' : money(numericValue(booking.providerPayoutAmount ?? booking.providerPayout))}</td>
                <td>{show(booking.payoutStatus)}</td>
                <td>{numericValue(booking.refundAmount) === null ? 'Not available' : money(numericValue(booking.refundAmount))}</td>
              </tr>)}</tbody>
            </table></div>
          </section>
        </>}
      </section>
    </AdminAccessGate>
  )
}
