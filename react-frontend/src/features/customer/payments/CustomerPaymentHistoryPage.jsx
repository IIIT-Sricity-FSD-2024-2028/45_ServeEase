import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import { CustomerPageHeader, InfoRow, LoadState, OpsModal } from '../CustomerOpsParts'
import { formatDisplayDate, formatPrice, statusPillClass } from '../customerOperations'
import '../customerOperations.css'

const emptyPayments = []

function belongsToCustomer(booking, userId, email) {
  if (!booking) return false
  if (booking.customerId && userId) return String(booking.customerId) === String(userId)
  if (booking.customerEmail && email) return String(booking.customerEmail).toLowerCase() === String(email).toLowerCase()
  return false
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

const money = (value) => (hasValue(value) && Number.isFinite(Number(value)) ? formatPrice(Number(value)) : 'Not provided')

function StatCard({ icon, tone, value, label }) {
  return <div className="stat-card-dashboard"><div className={`feature-icon ${tone}`}>{icon}</div><h3>{value}</h3><p>{label}</p></div>
}

// openPaymentModal() in customer.js: Transaction, Service and Payment Breakdown boxes.
function PaymentDetails({ payment, onClose }) {
  const status = hasValue(payment.paymentStatus) ? String(payment.paymentStatus) : 'Not provided'
  return <OpsModal className="payment-details-modal" labelId="payment-details-title" onClose={onClose} title="Payment Details">
    <div className="info-grid">
      <div className="info-box"><strong>Transaction Information</strong>
        <InfoRow label="Transaction ID:">{payment.paymentId || 'Not recorded'}</InfoRow>
        <InfoRow label="Booking Reference:">{payment.id}</InfoRow>
        <InfoRow label="Payment Status:"><span className={`status-pill ${statusPillClass(status)}`}>{status}</span></InfoRow>
      </div>
      <div className="info-box"><strong>Service Information</strong>
        <InfoRow label="Service Name:">{payment.service || 'Not provided'}</InfoRow>
        <InfoRow label="Provider Name:">{payment.provider || 'Not provided'}</InfoRow>
      </div>
      <div className="info-box"><strong>Payment Breakdown</strong>
        <InfoRow label="Payment Method:">{payment.paymentMethod || 'Not provided'}</InfoRow>
        <InfoRow label="Service Fee:">{money(payment.serviceFee)}</InfoRow>
        <InfoRow label="Tax (10% GST):">{money(payment.taxAmount)}</InfoRow>
        <InfoRow label="Platform Fee (5%):">{money(payment.platformFeeAmount)}</InfoRow>
        <InfoRow label="Total Paid:"><strong>{money(payment.customerTotal)}</strong></InfoRow>
        <InfoRow label="Payment Date:">{hasValue(payment.paymentDate) ? formatDisplayDate(payment.paymentDate) : 'Not provided'}</InfoRow>
      </div>
    </div>
  </OpsModal>
}

function PaymentRow({ payment, onView }) {
  const status = hasValue(payment.paymentStatus) ? String(payment.paymentStatus) : 'Not provided'
  return <tr>
    <td>{payment.paymentId || 'Not recorded'}</td>
    <td>{payment.id || 'Not provided'}</td>
    <td>{payment.service || 'Not provided'}</td>
    <td>{payment.provider || 'Not provided'}</td>
    <td>{payment.paymentMethod || 'Not provided'}</td>
    <td>{money(payment.serviceFee)}</td>
    <td>{money(payment.taxAmount)}</td>
    <td>{money(payment.platformFeeAmount)}</td>
    <td>{money(payment.customerTotal)}</td>
    <td>{hasValue(payment.paymentDate) ? formatDisplayDate(payment.paymentDate) : 'Not provided'}</td>
    <td><span className={`status-pill ${statusPillClass(status)}`}>{status}</span></td>
    <td><button className="table-link-btn" onClick={() => onView(payment)} type="button">View Details</button></td>
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
        // Every booking records its payment on the booking itself (paymentStatus, paymentDate, totals);
        // there is no separate payments endpoint. A missing paymentId stays "Not recorded".
        const customerTransactions = records.filter((booking) => belongsToCustomer(booking, userId, email)
          && hasValue(booking.paymentStatus))
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

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['Payment History']]} description="View all your service payment transactions." title="Payment History" />

    <LoadState error={error} loadingText="Loading your payment information…" state={loadState === 'ready' ? 'ready' : loadState} />

    {loadState === 'ready' && <>
      <section aria-label="Payment summaries" className="dashboard-stats-grid">
        <StatCard icon="✅" tone="green" label="Total Payments Made" value={money(summary.totalPaid ?? 0)} />
        <StatCard icon="📄" tone="orange" label="Successful Transactions" value={String(summary.successful)} />
        <StatCard icon="🔄" tone="blue" label="Refunded Amount" value={money(summary.refunded ?? 0)} />
      </section>

      <section className="table-section">
        <h2 className="section-title-left">Transaction History</h2>
        <div className="table-card">
          <table className="data-table">
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
              ? payments.map((payment) => <PaymentRow key={payment.paymentId || payment.id} onView={setSelectedPayment} payment={payment} />)
              : <tr><td colSpan="12">No payments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}

    {selectedPayment && <PaymentDetails onClose={() => setSelectedPayment(null)} payment={selectedPayment} />}
  </div>
}
