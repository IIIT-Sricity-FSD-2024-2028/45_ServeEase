import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import './customerPayments.css'

const emptyPayments = []
const supportedPaymentStatuses = new Set(['Pending', 'Successful', 'Refunded', 'Failed'])

function belongsToCustomer(booking, userId, email) {
  if (!booking) return false
  if (booking.customerId && userId) return String(booking.customerId) === String(userId)
  if (booking.customerEmail && email) return String(booking.customerEmail).toLowerCase() === String(email).toLowerCase()
  return false
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function formatMoney(value) {
  if (!hasValue(value) || !Number.isFinite(Number(value))) return 'Not provided'
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatServiceDate(value) {
  if (!value) return 'Not provided'
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)

  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(parsed)
}

function statusClass(status) {
  return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function SummaryCard({ label, count, status }) {
  return <article className="customer-payments-summary-card">
    <h2>{label}</h2>
    <p className="customer-payments-summary-count">{count}</p>
    <p>Booking records marked <span className={`customer-payments-status customer-payments-status--${statusClass(status)}`}>{status}</span></p>
  </article>
}

function PaymentBreakdown({ booking }) {
  const details = [
    ['Service fee', booking.serviceFee],
    ['Tax', booking.taxAmount],
    ['Platform fee', booking.platformFeeAmount],
  ].filter(([, value]) => hasValue(value))

  if (!details.length) return null

  return <dl className="customer-payments-breakdown">
    {details.map(([label, value]) => <div key={label}>
      <dt>{label}</dt>
      <dd>{formatMoney(value)}</dd>
    </div>)}
  </dl>
}

function PaymentRecord({ booking }) {
  const status = hasValue(booking.paymentStatus) ? String(booking.paymentStatus) : 'Not provided'
  const knownStatus = supportedPaymentStatuses.has(status)

  return <tr>
    <td>
      <strong>{booking.id || 'Not provided'}</strong>
      <PaymentBreakdown booking={booking} />
    </td>
    <td>
      <strong>{booking.service || 'Service not provided'}</strong>
      <span className="customer-payments-secondary">{booking.provider || 'Provider not provided'}</span>
    </td>
    <td>{formatServiceDate(booking.date)}</td>
    <td>{formatMoney(hasValue(booking.customerTotal) ? booking.customerTotal : booking.amount)}</td>
    <td>{booking.paymentMethod || 'Not provided'}</td>
    <td>
      <span className={`customer-payments-status${knownStatus ? ` customer-payments-status--${statusClass(status)}` : ''}`}>
        {status}
      </span>
    </td>
    <td>{booking.paymentId || 'Not provided'}</td>
  </tr>
}

export default function CustomerPaymentHistoryPage() {
  const { currentUser, isAuthenticated } = useAuth()
  const userId = currentUser?.userId
  const email = currentUser?.email
  const identityKey = JSON.stringify([userId || '', email || ''])
  const [result, setResult] = useState({ identityKey: '', status: 'loading', payments: [], error: '' })

  useEffect(() => {
    let active = true
    if (!isAuthenticated) return () => { active = false }

    bookingsApi.list()
      .then((records) => {
        if (!active) return
        if (!Array.isArray(records)) throw new Error('The booking service returned an invalid response.')
        const customerBookings = records.filter((booking) => belongsToCustomer(booking, userId, email))
        const paymentRecords = customerBookings.filter((booking) => hasValue(booking.paymentStatus))
        setResult({ identityKey, status: 'ready', payments: paymentRecords, error: '' })
      })
      .catch((requestError) => {
        if (!active) return
        setResult({
          identityKey,
          status: 'error',
          payments: [],
          error: requestError.message || 'Payment information could not be loaded.',
        })
      })

    return () => { active = false }
  }, [email, identityKey, isAuthenticated, userId])

  const loadState = !isAuthenticated
    ? 'error'
    : result.identityKey === identityKey ? result.status : 'loading'
  const error = !isAuthenticated
    ? 'Please sign in to view payment information.'
    : result.error
  const payments = result.identityKey === identityKey ? result.payments : emptyPayments

  const summary = useMemo(() => ({
    successful: payments.filter((booking) => booking.paymentStatus === 'Successful').length,
    pending: payments.filter((booking) => booking.paymentStatus === 'Pending').length,
    refunded: payments.filter((booking) => booking.paymentStatus === 'Refunded').length,
    failed: payments.filter((booking) => booking.paymentStatus === 'Failed').length,
  }), [payments])

  return <div className="customer-payments-page">
    <header className="customer-payments-heading">
      <div>
        <p className="customer-payments-eyebrow">Customer account</p>
        <h1>Payment History</h1>
        <p>Payment details available on your service booking records.</p>
      </div>
      <Link className="customer-payments-bookings-link" to="/customer/bookings">My Bookings</Link>
    </header>

    <p className="customer-payments-integrity-note" role="note">
      This view is derived from booking records, not a separate transaction ledger. The API may generate a payment date from the service date, so only the service date is shown here.
    </p>

    {loadState === 'loading' && <LoadingState message="Loading your payment information…" />}
    {loadState === 'error' && <ErrorState message={error} />}

    {loadState === 'ready' && <>
      <section className="customer-payments-summary" aria-label="Payment status counts">
        <SummaryCard label="Successful" count={summary.successful} status="Successful" />
        <SummaryCard label="Pending" count={summary.pending} status="Pending" />
        <SummaryCard label="Refunded" count={summary.refunded} status="Refunded" />
        <SummaryCard label="Failed" count={summary.failed} status="Failed" />
      </section>

      <section className="customer-payments-history" aria-labelledby="customer-payments-history-title">
        <div className="customer-payments-section-heading">
          <div>
            <p className="customer-payments-eyebrow">Booking-derived records</p>
            <h2 id="customer-payments-history-title">Payment details</h2>
          </div>
          <span>{payments.length} {payments.length === 1 ? 'record' : 'records'}</span>
        </div>

        {payments.length
          ? <div className="customer-payments-table-wrap">
            <table className="customer-payments-table">
              <thead><tr>
                <th scope="col">Booking reference</th>
                <th scope="col">Service / provider</th>
                <th scope="col">Service date</th>
                <th scope="col">Booking amount</th>
                <th scope="col">Payment method</th>
                <th scope="col">Payment status</th>
                <th scope="col">Payment reference</th>
              </tr></thead>
              <tbody>{payments.map((booking, index) => <PaymentRecord
                key={booking.id || `${booking.createdAt || booking.date || 'booking'}-${index}`}
                booking={booking}
              />)}</tbody>
            </table>
          </div>
          : <EmptyState message="No booking records with payment status are available for your account." />}
      </section>
    </>}
  </div>
}
