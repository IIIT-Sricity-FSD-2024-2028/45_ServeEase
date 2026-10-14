import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import './customerPayments.css'

const emptyPayments = []
const knownPaymentStatuses = new Set(['Pending', 'Successful', 'Refunded', 'Failed'])

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

function formatDate(value) {
  if (!hasValue(value)) return 'Not provided'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(parsed)
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function SummaryCard({ icon, tone, label, value }) {
  return <article className="customer-payments-summary-card">
    <span className={`customer-payments-summary-icon customer-payments-summary-icon--${tone}`} aria-hidden="true">{icon}</span>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  </article>
}

function PaymentDetails({ payment, onClose }) {
  const status = String(payment.paymentStatus || 'Not provided')
  return <div className="customer-payments-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation">
    <section aria-labelledby="payment-details-title" aria-modal="true" className="customer-payments-modal" role="dialog">
      <header className="customer-payments-modal-head">
        <h2 id="payment-details-title">Payment Details</h2>
        <button aria-label="Close payment details" className="customer-payments-modal-close" onClick={onClose} type="button">×</button>
      </header>
      <div className="customer-payments-detail-grid">
        <section><h3>Transaction Information</h3><Detail label="Transaction ID" value={payment.paymentId} /><Detail label="Booking Reference" value={payment.id} /><Detail label="Payment Status" value={status} /></section>
        <section><h3>Service Information</h3><Detail label="Service Name" value={payment.service} /><Detail label="Service Provider" value={payment.provider} /></section>
        <section><h3>Payment Breakdown</h3><Detail label="Payment Method" value={payment.paymentMethod} /><Detail label="Service Fee" value={formatMoney(payment.serviceFee)} /><Detail label="Tax (10%)" value={formatMoney(payment.taxAmount)} /><Detail label="Platform Fee (5%)" value={formatMoney(payment.platformFeeAmount)} /><Detail label="Total Paid" value={formatMoney(payment.customerTotal)} /><Detail label="Transaction Date" value={formatDate(payment.paymentDate)} /></section>
      </div>
    </section>
  </div>
}

function Detail({ label, value }) {
  return <div className="customer-payments-detail-row"><span>{label}</span><strong>{hasValue(value) ? value : 'Not provided'}</strong></div>
}

function PaymentRow({ payment, onView }) {
  const status = hasValue(payment.paymentStatus) ? String(payment.paymentStatus) : 'Not provided'
  const hasKnownStatus = knownPaymentStatuses.has(status)

  return <tr>
    <td>{payment.paymentId}</td>
    <td>{payment.id || 'Not provided'}</td>
    <td>{payment.service || 'Not provided'}</td>
    <td>{payment.provider || 'Not provided'}</td>
    <td>{payment.paymentMethod || 'Not provided'}</td>
    <td>{formatMoney(payment.serviceFee)}</td>
    <td>{formatMoney(payment.taxAmount)}</td>
    <td>{formatMoney(payment.platformFeeAmount)}</td>
    <td>{formatMoney(payment.customerTotal)}</td>
    <td>{formatDate(payment.paymentDate)}</td>
    <td><span className={`customer-payments-status${hasKnownStatus ? ` customer-payments-status--${statusClass(status)}` : ''}`}>{status}</span></td>
    <td><button className="customer-payments-view-button" onClick={() => onView(payment)} type="button">View Details</button></td>
  </tr>
}

export default function CustomerPaymentHistoryPage() {
  const { currentUser, isAuthenticated } = useAuth()
  const userId = currentUser?.userId
  const email = currentUser?.email
  const identityKey = JSON.stringify([userId || '', email || ''])
  const [result, setResult] = useState({ identityKey: '', status: 'loading', payments: [], error: '' })
  const [selectedPayment, setSelectedPayment] = useState(null)

  useEffect(() => {
    let active = true
    if (!isAuthenticated) return () => { active = false }

    bookingsApi.list()
      .then((records) => {
        if (!active) return
        if (!Array.isArray(records)) throw new Error('The booking service returned an invalid response.')
        const customerTransactions = records.filter((booking) => belongsToCustomer(booking, userId, email)
          && hasValue(booking.paymentId))
        setResult({ identityKey, status: 'ready', payments: customerTransactions, error: '' })
      })
      .catch((requestError) => {
        if (!active) return
        setResult({ identityKey, status: 'error', payments: [], error: requestError.message || 'Payment information could not be loaded.' })
      })

    return () => { active = false }
  }, [email, identityKey, isAuthenticated, userId])

  const loadState = !isAuthenticated ? 'error' : result.identityKey === identityKey ? result.status : 'loading'
  const error = !isAuthenticated ? 'Please sign in to view payment information.' : result.error
  const payments = result.identityKey === identityKey ? result.payments : emptyPayments
  const summary = useMemo(() => {
    const paidStatuses = new Set(['Successful', 'Refunded'])
    const paidAmounts = payments.flatMap((payment) => {
      if (!paidStatuses.has(payment.paymentStatus) || !hasValue(payment.customerTotal)) return []
      const amount = Number(payment.customerTotal)
      return Number.isFinite(amount) ? [amount] : []
    })
    const totalPaid = paidAmounts.length ? paidAmounts.reduce((total, amount) => total + amount, 0) : null
    const successful = payments.filter((payment) => payment.paymentStatus === 'Successful').length
    const refundAmounts = payments.flatMap((payment) => {
      if (!hasValue(payment.refundAmount)) return []
      const amount = Number(payment.refundAmount)
      return Number.isFinite(amount) ? [amount] : []
    })
    const refunded = refundAmounts.length ? refundAmounts.reduce((total, amount) => total + amount, 0) : null
    return { totalPaid, successful, refunded }
  }, [payments])

  return <div className="customer-payments-page">
    <nav aria-label="Breadcrumb" className="customer-payments-breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">›</span><Link to="/customer/dashboard">Customer Dashboard</Link><span aria-hidden="true">›</span><strong aria-current="page">Payment History</strong></nav>
    <header className="customer-payments-heading">
      <h1>Payment History</h1>
      <p>View all your service payment transactions.</p>
    </header>

    {loadState === 'loading' && <LoadingState message="Loading your payment information…" />}
    {loadState === 'error' && <ErrorState message={error} />}

    {loadState === 'ready' && <>
      <section aria-label="Payment summaries" className="customer-payments-summary">
        <SummaryCard icon="✅" tone="green" label="Total Payments Made" value={formatMoney(summary.totalPaid)} />
        <SummaryCard icon="📄" tone="orange" label="Successful Transactions" value={String(summary.successful)} />
        <SummaryCard icon="🔄" tone="blue" label="Refunded Amount" value={formatMoney(summary.refunded)} />
      </section>

      <section aria-labelledby="customer-payments-history-title" className="customer-payments-history">
        <h2 id="customer-payments-history-title">Transaction History</h2>
        <div className="customer-payments-table-wrap">
          <table className="customer-payments-table">
            <thead><tr>
              <th scope="col">Transaction ID</th>
              <th scope="col">Booking Reference</th>
              <th scope="col">Service Name</th>
              <th scope="col">Service Provider</th>
              <th scope="col">Payment Method</th>
              <th scope="col">Service Fee</th>
              <th scope="col">Tax (10%)</th>
              <th scope="col">Platform Fee (5%)</th>
              <th scope="col">Total Paid</th>
              <th scope="col">Transaction Date</th>
              <th scope="col">Payment Status</th>
              <th scope="col">Actions</th>
            </tr></thead>
            <tbody>{payments.length
              ? payments.map((payment) => <PaymentRow key={payment.paymentId} onView={setSelectedPayment} payment={payment} />)
              : <tr><td className="customer-payments-empty-cell" colSpan="12"><EmptyState message="No verified payment transactions are available for your account." /></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}

    {selectedPayment && <PaymentDetails onClose={() => setSelectedPayment(null)} payment={selectedPayment} />}
  </div>
}
