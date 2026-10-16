import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi } from '../../../services/api'
import { CustomerPageHeader, InfoRow, LoadState, OpsModal } from '../CustomerOpsParts'
import { formatDisplayDate, formatPrice, paymentTag, statusPillClass, summarizePayments, transactionId } from '../customerOperations'
import { settleBooking } from '../../finance/revenueModel'
import { PaymentMethod } from '../../finance/PaymentMethod'
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

const money = (value) => (hasValue(value) && Number.isFinite(Number(value)) ? formatPrice(Number(value)) : '—')

function StatCard({ icon, tone, value, label }) {
  return <div className="stat-card-dashboard"><div className={`feature-icon ${tone}`}>{icon}</div><h3>{value}</h3><p>{label}</p></div>
}

// openPaymentModal() in customer.js: Transaction, Service and Payment Breakdown boxes.
function PaymentDetails({ payment, onClose }) {
  const status = paymentTag(payment.paymentStatus)
  return <OpsModal className="payment-details-modal" labelId="payment-details-title" onClose={onClose} title="Payment Details">
    <div className="info-grid">
      <div className="info-box"><strong>Transaction Information</strong>
        <InfoRow label="Transaction ID:">{transactionId(payment) || '—'}</InfoRow>
        <InfoRow label="Booking Reference:">{payment.id}</InfoRow>
        <InfoRow label="Payment Status:"><span className={`status-pill ${statusPillClass(status)}`}>{status}</span></InfoRow>
      </div>
      <div className="info-box"><strong>Service Information</strong>
        <InfoRow label="Service Name:">{payment.service || '—'}</InfoRow>
        <InfoRow label="Provider Name:">{payment.provider || '—'}</InfoRow>
      </div>
      <div className="info-box"><strong>Payment Breakdown</strong>
        <InfoRow label="Payment Method:"><PaymentMethod value={payment.paymentMethod} /></InfoRow>
        <InfoRow label="Service Fee:">{money(payment.serviceFee)}</InfoRow>
        <InfoRow label={`Tax (${payment.taxRate}%):`}>{money(payment.taxAmount)}</InfoRow>
        <InfoRow label={`Platform Fee (${payment.platformFeeRate}%):`}>{money(payment.platformFeeAmount)}</InfoRow>
        <InfoRow label="Amount Paid:"><strong>{money(payment.customerTotal)}</strong></InfoRow>
        <InfoRow label="Payment Date:">{hasValue(payment.paymentDate) ? formatDisplayDate(payment.paymentDate) : '—'}</InfoRow>
      </div>
      {payment.cancellationPolicy && <div className="info-box"><strong>Refund</strong>
        <InfoRow label="Policy Applied:">{payment.cancellationPolicyLabel}</InfoRow>
        <InfoRow label="Refund Amount:"><strong>{money(payment.refundAmount)}</strong></InfoRow>
        <InfoRow label="Non-refundable:">{money(payment.customerTotal - payment.refundAmount)}</InfoRow>
        <InfoRow label="Refund Status:">{payment.refundStatus}</InfoRow>
      </div>}
    </div>
  </OpsModal>
}

function PaymentRow({ payment, onView }) {
  const status = paymentTag(payment.paymentStatus)
  return <tr>
    <td>{transactionId(payment) || '—'}</td>
    <td>{payment.id || '—'}</td>
    <td>{payment.service || '—'}</td>
    <td>{payment.provider || '—'}</td>
    <td><PaymentMethod value={payment.paymentMethod} /></td>
    <td>{money(payment.customerTotal)}</td>
    <td>{hasValue(payment.paymentDate) ? formatDisplayDate(payment.paymentDate) : '—'}</td>
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
        // there is no separate payments endpoint.
        const customerTransactions = records.filter((booking) => belongsToCustomer(booking, userId, email)).map(settleBooking)
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
  const summary = useMemo(() => summarizePayments(payments), [payments])

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['Payment History']]} description="View all your service payment transactions." title="Payment History" />

    <LoadState error={error} loadingText="Loading your payment information…" state={loadState === 'ready' ? 'ready' : loadState} />

    {loadState === 'ready' && <>
      <section aria-label="Payment summaries" className="dashboard-stats-grid">
        <StatCard icon="✅" tone="green" label="Total Payments Made" value={money(summary.totalPaid)} />
        <StatCard icon="📄" tone="orange" label="Paid Transactions" value={String(summary.successful)} />
        <StatCard icon="🔄" tone="blue" label="Refunded Amount" value={money(summary.refunded)} />
      </section>

      <section className="table-section">
        <h2 className="section-title-left">Transaction History</h2>
        <div className="table-card table-scroll">
          <table className="data-table">
            <thead><tr>
              <th scope="col">Transaction ID</th>
              <th scope="col">Booking Reference</th>
              <th scope="col">Service Name</th>
              <th scope="col">Service Provider</th>
              <th scope="col">Payment Method</th>
              <th scope="col">Amount Paid</th>
              <th scope="col">Transaction Date</th>
              <th scope="col">Payment Status</th>
              <th scope="col">Actions</th>
            </tr></thead>
            <tbody>{payments.length
              ? payments.map((payment) => <PaymentRow key={payment.id} onView={setSelectedPayment} payment={payment} />)
              : <tr><td colSpan="9">No payments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}

    {selectedPayment && <PaymentDetails onClose={() => setSelectedPayment(null)} payment={selectedPayment} />}
  </div>
}
