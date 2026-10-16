import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { CANCELLATION_POLICY_LINES, roundCurrency, settleBooking } from '../finance/revenueModel'
import { PaymentMethod } from '../finance/PaymentMethod'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { listBookings } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

const sum = (records, field) => roundCurrency(records.reduce((total, record) => total + record[field], 0))
const earnedPayout = (row) => row.payoutStatus === 'Paid' || row.payoutStatus === 'Partially Paid'

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function formatRate(records, field) {
  const values = [...new Set(records.map((record) => record[field]))]
  if (values.length === 0) return 'Not available'
  return values.length === 1 ? `${values[0]}%` : `Varies (${values.length} recorded rates)`
}

function FilteredTable({ title, records, columns, searchFields, searchPlaceholder, statusField, search, setSearch, status, setStatus, emptyMessage }) {
  const statuses = [...new Set(records.map((record) => record[statusField]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  const term = search.trim().toLocaleLowerCase()
  const visibleRows = records.filter((record) => {
    const matchesSearch = !term || searchFields.some((field) => String(record[field] ?? '').toLocaleLowerCase().includes(term))
    const matchesStatus = !statusField || status === 'all' || String(record[statusField] || '') === status
    return matchesSearch && matchesStatus
  })

  return (
    <section className="admin-panel admin-finance-table-panel">
      <div className="admin-panel-heading"><h2>{title} ({records.length})</h2></div>
      <div className={`admin-finance-controls${statusField ? '' : ' admin-finance-controls--single'}`}>
        <label className="admin-sr-only" htmlFor={`admin-finance-search-${title.replaceAll(' ', '-')}`}>{searchPlaceholder}</label>
        <input className="admin-control" id={`admin-finance-search-${title.replaceAll(' ', '-')}`} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} type="search" value={search} />
        {statusField && <>
          <label className="admin-sr-only" htmlFor={`admin-finance-status-${title.replaceAll(' ', '-')}`}>Filter {title.toLocaleLowerCase()} by status</label>
          <select className="admin-control" id={`admin-finance-status-${title.replaceAll(' ', '-')}`} onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </>}
      </div>
      {visibleRows.length === 0 ? <EmptyState message={records.length === 0 ? emptyMessage : 'No matching records found.'} /> : <div className="admin-table-wrap admin-finance-table-wrap"><table className="admin-table admin-finance-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
        <tbody>{visibleRows.map((record, index) => <tr key={record.id ?? record.paymentId ?? record.bookingId ?? index}>
          {columns.map((column) => <td key={column.label}>{column.render ? column.render(record) : show(record[column.field])}</td>)}
        </tr>)}</tbody>
      </table></div>}
    </section>
  )
}

function FinanceMetric({ icon, label, amount, tone, caption }) {
  return <article className="admin-finance-stat">
    <span className={`admin-finance-icon admin-finance-icon--${tone}`} aria-hidden="true">{icon}</span>
    <strong>{amount === null ? 'Not available' : money(amount)}</strong>
    <p>{label}</p>
    {caption && <small>{caption}</small>}
  </article>
}

export default function FinanceOverviewPage() {
  const { data, isLoading, error, reload } = useAdminData(listBookings)
  const [filters, setFilters] = useState({})
  const bookings = useMemo(() => Array.isArray(data) ? data : [], [data])
  const rows = useMemo(() => bookings.map(settleBooking).filter((row) => row.financialsAvailable), [bookings])
  const refunds = useMemo(() => rows.filter((row) => row.cancellationPolicy), [rows])

  const totals = useMemo(() => {
    const collected = sum(rows, 'customerTotal')
    const refunded = sum(rows, 'refundAmount')
    const taxCharged = sum(rows, 'taxAmount')
    const taxRefunded = sum(rows, 'taxRefundAmount')
    return {
      netCollections: roundCurrency(collected - refunded),
      providerEarnings: sum(rows.filter(earnedPayout), 'providerPayout'),
      platformRevenue: sum(rows, 'platformRevenueAmount'),
      pendingPayout: sum(rows.filter((row) => row.payoutStatus === 'Pending'), 'providerPayout'),
      refunded,
      taxCharged,
      taxRefunded,
      taxRefundCount: rows.filter((row) => row.taxRefundAmount > 0).length,
    }
  }, [rows])
  const latestRecordDate = useMemo(() => {
    const dates = bookings.flatMap((booking) => [booking.statusUpdatedAt, booking.createdAt, booking.paymentDate, booking.refundDate, booking.payoutDate])
      .map((value) => value ? new Date(value) : null)
      .filter((date) => date && !Number.isNaN(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0]
    return dates ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(dates) : 'Not available'
  }, [bookings])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const customer = (row) => show(row.customerName || row.customerEmail || row.customerId)
  const provider = (row) => show(row.provider || row.providerId)
  const paymentColumns = [
    { label: 'Transaction ID', render: (row) => show(row.paymentId) },
    { label: 'Booking ID', field: 'id' },
    { label: 'Customer', render: customer },
    { label: 'Provider', render: provider },
    { label: 'Method', render: (row) => <PaymentMethod value={row.paymentMethod} /> },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Tax', render: (row) => money(row.taxAmount) },
    { label: 'Platform Fee', render: (row) => money(row.platformFeeAmount) },
    { label: 'Total Paid', render: (row) => money(row.customerTotal) },
    { label: 'Date', render: (row) => formatDate(row.paymentDate || row.createdAt) },
    { label: 'Status', render: (row) => <StatusBadge tone={row.paymentStatus === 'Paid' ? 'ready' : 'neutral'}>{row.paymentStatus}</StatusBadge> },
  ]
  const earningsColumns = [
    { label: 'Transaction / Payment ID', render: (row) => show(row.paymentId) },
    { label: 'Provider', render: provider },
    { label: 'Booking', field: 'id' },
    { label: 'Customer', render: customer },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Provider Commission', render: (row) => money(row.providerCommissionAmount) },
    { label: 'Provider Payout', render: (row) => money(row.providerPayout) },
    { label: 'Payment Date', render: (row) => formatDate(row.payoutDate || row.paymentDate) },
    { label: 'Payout Status', render: (row) => <StatusBadge tone={earnedPayout(row) ? 'ready' : 'neutral'}>{row.payoutStatus}</StatusBadge> },
  ]
  const ledgerColumns = [
    { label: 'Booking ID', field: 'id' },
    { label: 'Customer', render: customer },
    { label: 'Provider', render: provider },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Customer Platform Fee', render: (row) => money(row.platformFeeAmount) },
    { label: 'Provider Commission', render: (row) => money(row.providerCommissionAmount) },
    { label: 'Total Platform Revenue', render: (row) => money(row.platformRevenueAmount) },
    { label: 'Provider Payout', render: (row) => money(row.providerPayout) },
    { label: 'Status', render: (row) => show(row.status) },
    { label: 'Date', render: (row) => formatDate(row.paymentDate || row.date) },
  ]
  const refundColumns = [
    { label: 'Refund ID', render: (row) => show(row.paymentId) },
    { label: 'Booking Ref', field: 'id' },
    { label: 'Customer', render: customer },
    { label: 'Provider', render: provider },
    { label: 'Cancelled By', render: (row) => show(row.status === 'Rejected' ? 'Provider' : row.cancellationActor) },
    { label: 'Original Amount', render: (row) => money(row.customerTotal) },
    { label: 'Refunded Amount', render: (row) => money(row.refundAmount) },
    { label: 'Tax Refunded', render: (row) => money(row.taxRefundAmount) },
    { label: 'Non-refundable', render: (row) => money(roundCurrency(row.customerTotal - row.refundAmount)) },
    { label: 'Refund Policy', render: (row) => row.cancellationPolicyLabel },
    { label: 'Refund Date', render: (row) => formatDate(row.refundDate) },
    { label: 'Status', render: (row) => <StatusBadge tone={row.refundStatus === 'Refunded' ? 'ready' : 'neutral'}>{row.refundStatus}</StatusBadge> },
  ]

  return (
    <AdminAccessGate>
      <section className="admin-page admin-finance-page">
        <AdminPageHeader hero section="Finance & Revenue" title="Finance & Revenue" description="Monitor payments, provider earnings and platform financial activity." />
        <p className="admin-note">Figures are calculated from booking records with the revenue model and cancellation policy shown below.</p>

        {isLoading && <LoadingState message="Loading booking finance data…" />}
        {!isLoading && error && <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>}
        {!isLoading && !error && bookings.length === 0 && <EmptyState message="No booking records are available." />}

        {!isLoading && !error && bookings.length > 0 && <>
          <section aria-label="Financial summary" className="admin-finance-stats">
            <FinanceMetric caption="Customer totals collected less refunds" icon="₹" label="Net Customer Collections" tone="green" amount={totals.netCollections} />
            <FinanceMetric caption="Payouts for completed bookings and paid cancellations" icon="↗" label="Provider Net Earnings" tone="blue" amount={totals.providerEarnings} />
            <FinanceMetric caption="Customer platform fee plus provider commission, adjusted by cancellation policy" icon="◆" label="Total Platform Revenue" tone="purple" amount={totals.platformRevenue} />
            <FinanceMetric caption="Expected payout for bookings not yet completed" icon="◷" label="Pending Payouts" tone="orange" amount={totals.pendingPayout} />
            <FinanceMetric caption="Sum of refunds issued under the cancellation policy" icon="↻" label="Refunds Processed" tone="blue" amount={totals.refunded} />
          </section>

          <div className="admin-finance-overview">
            <section className="admin-panel admin-finance-summary-panel">
              <h2>Financial Overview</h2>
              <div className="admin-finance-summary-grid">
                <article><span>Customer Payment Transactions</span><strong>{rows.length}</strong></article>
                <article><span>Provider Net Earnings Records</span><strong>{rows.filter(earnedPayout).length}</strong></article>
                <article><span>Financial Source</span><strong>Booking records and revenue model</strong></article>
                <article><span>Last updated</span><strong>{latestRecordDate}</strong></article>
              </div>
            </section>
            <aside className="admin-panel admin-finance-model">
              <h2>Revenue Model</h2>
              <div className="admin-finance-rate-grid">
                <article><span>Customer Tax</span><strong>{formatRate(rows, 'taxRate')}</strong><small>of Service Fee (not revenue)</small></article>
                <article><span>Customer Platform Fee</span><strong>{formatRate(rows, 'platformFeeRate')}</strong><small>of Service Fee</small></article>
                <article><span>Provider-Side Commission</span><strong>{formatRate(rows, 'providerCommissionRate')}</strong><small>of Service Fee</small></article>
              </div>
              <div className="admin-finance-total-rate"><span>Total Platform Revenue</span><strong>{(() => {
                const platform = [...new Set(rows.map((row) => row.platformFeeRate))]
                const commission = [...new Set(rows.map((row) => row.providerCommissionRate))]
                return platform.length === 1 && commission.length === 1 ? `${platform[0] + commission[0]}% of Service Fee` : 'Not available'
              })()}</strong></div>
              <h3>Cancellation Policy</h3>
              {CANCELLATION_POLICY_LINES.map((line) => <p key={line}>{line}</p>)}
            </aside>
          </div>

          <FilteredTable title="Customer Payment Transactions" records={rows} columns={paymentColumns} searchFields={['paymentId', 'id', 'customerName', 'customerEmail', 'provider', 'providerId', 'paymentMethod']} searchPlaceholder="Search transaction, booking, customer, or provider…" statusField="paymentStatus" search={filters.paymentSearch || ''} setSearch={(value) => updateFilter('paymentSearch', value)} status={filters.paymentStatus || 'all'} setStatus={(value) => updateFilter('paymentStatus', value)} emptyMessage="No customer payment transaction records are available." />
          <FilteredTable title="Provider Net Earnings" records={rows} columns={earningsColumns} searchFields={['paymentId', 'provider', 'providerId', 'id', 'customerName', 'customerEmail']} searchPlaceholder="Search transaction, provider, booking, or customer…" statusField="payoutStatus" search={filters.earningsSearch || ''} setSearch={(value) => updateFilter('earningsSearch', value)} status={filters.earningsStatus || 'all'} setStatus={(value) => updateFilter('earningsStatus', value)} emptyMessage="No provider payout records are available." />
          <FilteredTable title="Commission Ledger" records={rows} columns={ledgerColumns} searchFields={['id', 'customerName', 'customerEmail', 'provider', 'providerId']} searchPlaceholder="Search booking, customer, or provider…" search={filters.ledgerSearch || ''} setSearch={(value) => updateFilter('ledgerSearch', value)} emptyMessage="No commission ledger records are available." />
          <FilteredTable title="Refund Information" records={refunds} columns={refundColumns} searchFields={['paymentId', 'id', 'customerName', 'customerEmail', 'provider', 'providerId', 'cancellationPolicy']} searchPlaceholder="Search reference, booking, customer, or provider…" statusField="refundStatus" search={filters.refundSearch || ''} setSearch={(value) => updateFilter('refundSearch', value)} status={filters.refundStatus || 'all'} setStatus={(value) => updateFilter('refundStatus', value)} emptyMessage="No refund records are available." />

          <section className="admin-panel admin-finance-tax-panel">
            <h2>Tax Record</h2>
            <div className="admin-finance-tax-grid">
              <article><span>Tax Charged</span><strong>{money(totals.taxCharged)}</strong></article>
              <article><span>Tax Refunded</span><strong>{money(totals.taxRefunded)}</strong></article>
              <article><span>Net Tax Recorded</span><strong>{money(roundCurrency(totals.taxCharged - totals.taxRefunded))}</strong></article>
              <article><span>Tax Transactions</span><strong>{rows.length}</strong></article>
              <article><span>Refunded Tax Transactions</span><strong>{totals.taxRefundCount}</strong></article>
            </div>
          </section>
        </>}
      </section>
    </AdminAccessGate>
  )
}
