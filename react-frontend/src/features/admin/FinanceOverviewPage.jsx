import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { listBookings } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

const paidStatuses = new Set(['paid', 'success', 'successful', 'refunded'])
const legacyRates = { taxRate: 10, platformFeeRate: 5, providerCommissionRate: 10 }

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function sumRecords(records, getValue) {
  const values = records.map(getValue).filter((value) => value !== null)
  return { total: values.reduce((sum, value) => sum + value, 0), count: values.length }
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function formatRate(records, field) {
  const values = [...new Set(records.map((record) => numberOrNull(record[field])).filter((value) => value !== null))]
  if (values.length === 0) return `${legacyRates[field]}%`
  return values.length === 1 ? `${values[0]}%` : `Varies (${values.length} recorded rates)`
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function appointmentDate(dateValue, timeValue) {
  if (!dateValue) return null
  let date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    const match = String(dateValue).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
    if (match) date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  }
  if (Number.isNaN(date.getTime())) return null
  const timeMatch = String(timeValue || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i)
  if (timeMatch) {
    let hours = Number(timeMatch[1])
    if (String(timeMatch[3] || '').toUpperCase() === 'PM' && hours !== 12) hours += 12
    if (String(timeMatch[3] || '').toUpperCase() === 'AM' && hours === 12) hours = 0
    date.setHours(hours, Number(timeMatch[2]), 0, 0)
  }
  return date
}

function reconcileBooking(booking) {
  const status = String(booking.status || '').toLocaleLowerCase()
  const paymentStatus = String(booking.paymentStatus || '').toLocaleLowerCase()
  const refundAmountStored = numberOrNull(booking.refundAmount) || 0
  const isCancelled = status === 'cancelled'
  const hasCancellationOutcome = Boolean(booking.cancellationPolicy) || refundAmountStored > 0 || paymentStatus === 'refunded'
  if (!paidStatuses.has(paymentStatus) && !isCancelled && !hasCancellationOutcome) return null

  // Use the persisted base service fee and per-booking rates. The defaults are
  // the legacy finance-engine defaults when an older record has no rate fields.
  const serviceFee = numberOrNull(booking.serviceFee)
  if (serviceFee === null) return null
  const taxRate = numberOrNull(booking.taxRate) ?? legacyRates.taxRate
  const platformRate = numberOrNull(booking.platformFeeRate) ?? legacyRates.platformFeeRate
  const commissionRate = numberOrNull(booking.providerCommissionRate) ?? legacyRates.providerCommissionRate
  const taxAmount = numberOrNull(booking.taxAmount) ?? roundCurrency(serviceFee * taxRate / 100)
  const platformFee = numberOrNull(booking.platformFeeAmount ?? booking.customerPlatformFeeAmount)
    ?? roundCurrency(serviceFee * platformRate / 100)
  const commission = roundCurrency(serviceFee * commissionRate / 100)
  const customerTotal = numberOrNull(booking.customerTotal ?? booking.amount)
    ?? roundCurrency(serviceFee + taxAmount + platformFee)
  const completed = status === 'completed'
  const rejected = status === 'rejected'
  let providerCommission = completed ? commission : 0
  let providerPayout = completed ? roundCurrency(serviceFee - commission) : 0
  let platformRevenue = rejected ? 0 : roundCurrency(platformFee + commission)
  let expectedPayout = rejected ? 0 : roundCurrency(serviceFee - commission)
  let resolvedStatus = rejected ? 'Refunded' : booking.paymentStatus || 'Pending'
  let payoutStatus = completed ? 'Paid' : rejected ? 'Not Paid' : 'Pending'
  let refundAmount = refundAmountStored
  let refundStatus = booking.refundStatus
  let taxRefundAmount = numberOrNull(booking.taxRefundAmount ?? booking.refundTax) ?? 0
  let refundPolicy = booking.cancellationPolicy

  if (isCancelled) {
    const actor = String(booking.cancellationActor || 'Customer').toLocaleLowerCase()
    const providerCancelled = actor === 'provider'
    const cancelledAt = booking.cancelledAt ? new Date(booking.cancelledAt) : null
    const appointment = appointmentDate(booking.appointmentDate || booking.date, booking.appointmentTime || booking.time)
    const hoursBefore = appointment && cancelledAt && !Number.isNaN(cancelledAt.getTime())
      ? (appointment.getTime() - cancelledAt.getTime()) / 3600000
      : null
    let refundRate = 0
    let retainedServiceFee = serviceFee
    let policyCode = 'LEGACY_CANCELLATION_UNKNOWN'
    if (providerCancelled) {
      policyCode = 'PROVIDER_CANCEL_FULL_REFUND'
      refundRate = 1
      retainedServiceFee = 0
    } else if (hoursBefore !== null && hoursBefore > 24) {
      policyCode = 'CUSTOMER_CANCEL_GT_24H'
      refundRate = 1
      retainedServiceFee = 0
    } else if (hoursBefore !== null && hoursBefore >= 3) {
      policyCode = 'CUSTOMER_CANCEL_24H_TO_3H'
      refundRate = 0.7
      retainedServiceFee = roundCurrency(serviceFee * 0.3)
    } else if (hoursBefore !== null) {
      policyCode = 'CUSTOMER_CANCEL_LT_3H'
    }
    const retainedPlatformFee = providerCancelled || policyCode === 'CUSTOMER_CANCEL_GT_24H' ? 0 : platformFee
    providerCommission = roundCurrency(retainedServiceFee * commissionRate / 100)
    providerPayout = roundCurrency(retainedServiceFee - providerCommission)
    platformRevenue = providerCancelled || policyCode === 'CUSTOMER_CANCEL_GT_24H'
      ? 0
      : roundCurrency(retainedPlatformFee + providerCommission)
    expectedPayout = providerPayout
    payoutStatus = providerPayout > 0
      ? policyCode === 'CUSTOMER_CANCEL_24H_TO_3H' ? 'Partially Paid' : 'Paid'
      : 'Not Paid'
    refundAmount = providerCancelled ? customerTotal : roundCurrency(serviceFee * refundRate)
    refundStatus = refundAmount > 0 ? 'Refunded' : 'No Refund Due'
    taxRefundAmount = providerCancelled ? taxAmount : 0
    refundPolicy = policyCode
  }

  if (status === 'pending' || status === 'accepted' || status === 'requested') {
    payoutStatus = 'Pending'
  }
  const finalRefundStatus = isCancelled ? refundStatus : refundStatus || (refundAmount > 0 ? 'Refunded' : undefined)

  return {
    ...booking,
    serviceFee,
    taxAmount,
    platformFeeAmount: platformFee,
    providerCommissionAmount: providerCommission,
    providerPayout: providerPayout,
    providerPayoutAmount: numberOrNull(booking.providerPayoutAmount) ?? providerPayout,
    platformRevenueAmount: platformRevenue,
    customerTotal,
    payoutAmount: expectedPayout,
    payoutStatus,
    paymentStatus: resolvedStatus,
    refundAmount,
    refundStatus: finalRefundStatus,
    taxRefundAmount,
    cancellationPolicy: refundPolicy,
  }
}

function hasAnyField(record, fields) {
  return fields.some((field) => record[field] !== null && record[field] !== undefined && record[field] !== '')
}

function FilteredTable({ title, records, columns, searchFields, searchPlaceholder, statusField, search, setSearch, status, setStatus, emptyMessage, globalSearch }) {
  const statuses = [...new Set(records.map((record) => record[statusField]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  const term = search.trim().toLocaleLowerCase()
  const globalTerm = globalSearch.trim().toLocaleLowerCase()
  const visibleRows = records.filter((record) => {
    const matchesFields = (value) => !value || searchFields.some((field) => String(record[field] ?? '').toLocaleLowerCase().includes(value))
    const matchesSearch = matchesFields(term) && matchesFields(globalTerm)
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

function FinanceMetric({ icon, label, amount, tone }) {
  return <article className="admin-finance-stat">
    <span className={`admin-finance-icon admin-finance-icon--${tone}`} aria-hidden="true">{icon}</span>
    <strong>{amount === null ? 'Not available' : money(amount)}</strong>
    <p>{label}</p>
  </article>
}

export default function FinanceOverviewPage() {
  const { data, isLoading, error, reload } = useAdminData(listBookings)
  const [filters, setFilters] = useState({})
  const [globalSearch, setGlobalSearch] = useState('')
  useEffect(() => {
    const onFinanceSearch = (event) => setGlobalSearch(String(event.detail || ''))
    window.addEventListener('serveease-finance-search', onFinanceSearch)
    return () => window.removeEventListener('serveease-finance-search', onFinanceSearch)
  }, [])
  const bookings = useMemo(() => Array.isArray(data) ? data : [], [data])
  const transactions = useMemo(() => bookings.filter((booking) => hasAnyField(booking, ['paymentId', 'paymentStatus', 'paymentDate'])), [bookings])
  const financialRows = useMemo(() => bookings.map(reconcileBooking).filter(Boolean), [bookings])
  const earnings = useMemo(() => financialRows.filter((booking) => hasAnyField(booking, ['providerPayout', 'providerPayoutAmount', 'payoutStatus'])), [financialRows])
  const ledger = financialRows
  const refunds = useMemo(() => financialRows.filter((booking) => numberOrNull(booking.refundAmount) > 0
    || hasAnyField(booking, ['refundStatus', 'refundDate'])), [financialRows])

  const netCollections = useMemo(() => {
    const gross = sumRecords(financialRows, (booking) => numberOrNull(booking.customerTotal))
    const refunded = sumRecords(financialRows, (booking) => numberOrNull(booking.refundAmount))
    return gross.count ? Math.max(0, gross.total - refunded.total) : null
  }, [financialRows])
  const providerEarnings = useMemo(() => {
    const result = sumRecords(financialRows, (booking) => numberOrNull(booking.providerPayout))
    const hasPayoutData = financialRows.some((booking) => hasAnyField(booking, ['providerPayout', 'providerPayoutAmount']))
    return hasPayoutData ? result.total : null
  }, [financialRows])
  const platformRevenue = useMemo(() => {
    const result = sumRecords(financialRows, (booking) => numberOrNull(booking.platformRevenueAmount))
    return result.count ? result.total : null
  }, [financialRows])
  const pendingPayout = useMemo(() => {
    const pending = financialRows.filter((booking) => String(booking.payoutStatus || '').toLocaleLowerCase() === 'pending'
      && String(booking.paymentStatus || '').toLocaleLowerCase() !== 'refunded')
    const result = sumRecords(pending, (booking) => numberOrNull(booking.payoutAmount))
    const hasPayoutData = financialRows.some((booking) => hasAnyField(booking, ['payoutStatus', 'providerPayoutAmount', 'providerPayout']))
    return hasPayoutData ? result.total : null
  }, [financialRows])
  const refundTotal = useMemo(() => {
    const result = sumRecords(refunds, (booking) => numberOrNull(booking.refundAmount))
    return result.count ? result.total : null
  }, [refunds])
  const taxCharged = useMemo(() => sumRecords(financialRows, (booking) => numberOrNull(booking.taxAmount)), [financialRows])
  const taxRefunded = useMemo(() => sumRecords(financialRows, (booking) => numberOrNull(booking.taxRefundAmount ?? booking.refundTax)), [financialRows])
  const latestRecordDate = useMemo(() => {
    const dates = bookings.flatMap((booking) => [booking.statusUpdatedAt, booking.createdAt, booking.paymentDate, booking.refundDate, booking.payoutDate])
      .map((value) => value ? new Date(value) : null)
      .filter((date) => date && !Number.isNaN(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0]
    return dates ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'medium' }).format(dates) : 'Not available'
  }, [bookings])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const paymentColumns = [
    { label: 'Transaction ID', render: (row) => show(row.paymentId) },
    { label: 'Booking ID', field: 'id' },
    { label: 'Customer', render: (row) => show(row.customerName || row.customerEmail || row.customerId) },
    { label: 'Provider', render: (row) => show(row.provider || row.providerId) },
    { label: 'Method', field: 'paymentMethod' },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Tax', render: (row) => money(row.taxAmount) },
    { label: 'Platform Fee', render: (row) => money(row.platformFeeAmount ?? row.customerPlatformFeeAmount) },
    { label: 'Total Paid', render: (row) => money(row.customerTotal ?? row.amount) },
    { label: 'Date', render: (row) => formatDate(row.paymentDate || row.createdAt) },
    { label: 'Status', render: (row) => <StatusBadge tone={paidStatuses.has(String(row.paymentStatus || '').toLocaleLowerCase()) ? 'ready' : 'neutral'}>{show(row.paymentStatus)}</StatusBadge> },
  ]
  const earningsColumns = [
    { label: 'Transaction / Payment ID', render: (row) => show(row.paymentId) },
    { label: 'Provider', render: (row) => show(row.provider || row.providerId) },
    { label: 'Booking', field: 'id' },
    { label: 'Customer', render: (row) => show(row.customerName || row.customerEmail || row.customerId) },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Provider Commission', render: (row) => money(row.providerCommissionAmount) },
    { label: 'Provider Payout', render: (row) => money(row.providerPayout) },
    { label: 'Payment Date', render: (row) => formatDate(row.payoutDate || row.paymentDate) },
    { label: 'Payout Status', render: (row) => <StatusBadge tone={row.payoutStatus === 'Paid' ? 'ready' : 'neutral'}>{show(row.payoutStatus)}</StatusBadge> },
  ]
  const ledgerColumns = [
    { label: 'Booking ID', field: 'id' },
    { label: 'Customer', render: (row) => show(row.customerName || row.customerEmail || row.customerId) },
    { label: 'Provider', render: (row) => show(row.provider || row.providerId) },
    { label: 'Service Fee', render: (row) => money(row.serviceFee) },
    { label: 'Customer Platform Fee', render: (row) => money(row.platformFeeAmount ?? row.customerPlatformFeeAmount) },
    { label: 'Provider Commission', render: (row) => money(row.providerCommissionAmount) },
    { label: 'Total Platform Revenue', render: (row) => money(row.platformRevenueAmount) },
    { label: 'Provider Payout', render: (row) => money(row.providerPayout) },
    { label: 'Status', render: (row) => show(row.paymentStatus || row.status) },
    { label: 'Date', render: (row) => formatDate(row.paymentDate || row.date) },
  ]
  const refundColumns = [
    { label: 'Refund ID', render: (row) => show(row.paymentId) },
    { label: 'Booking Ref', field: 'id' },
    { label: 'Customer', render: (row) => show(row.customerName || row.customerEmail || row.customerId) },
    { label: 'Provider', render: (row) => show(row.provider || row.providerId) },
    { label: 'Original Amount', render: (row) => money(row.customerTotal ?? row.amount) },
    { label: 'Refunded Amount', render: (row) => money(row.refundAmount) },
    { label: 'Tax Refunded', render: (row) => money(row.taxRefundAmount ?? row.refundTax) },
    { label: 'Refund Date', render: (row) => formatDate(row.refundDate) },
    { label: 'Refund Policy', field: 'cancellationPolicy' },
    { label: 'Date', render: (row) => formatDate(row.paymentDate || row.createdAt) },
    { label: 'Status', render: (row) => <StatusBadge tone={row.refundStatus === 'Refunded' ? 'ready' : 'neutral'}>{show(row.refundStatus || row.paymentStatus)}</StatusBadge> },
  ]

  return (
    <AdminAccessGate>
      <section className="admin-page admin-finance-page">
        <nav aria-label="Breadcrumb" className="admin-breadcrumb admin-finance-breadcrumb">
          <Link to="/">Home</Link><span aria-hidden="true">›</span><Link to="/admin">Superuser</Link><span aria-hidden="true">›</span><strong>Finance &amp; Revenue</strong>
        </nav>
        <header className="admin-page-header admin-hero admin-finance-hero">
          <h1>Finance &amp; Revenue</h1>
          <p>Monitor payments, provider earnings and platform financial activity.</p>
        </header>

        {isLoading && <LoadingState message="Loading booking finance data…" />}
        {!isLoading && error && <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>}
        {!isLoading && !error && bookings.length === 0 && <EmptyState message="No booking records are available." />}

        {!isLoading && !error && bookings.length > 0 && <>
          <section aria-label="Financial summary" className="admin-finance-stats">
            <FinanceMetric icon="₹" label="Net Customer Collections" tone="green" amount={netCollections} />
            <FinanceMetric icon="↗" label="Provider Net Earnings" tone="blue" amount={providerEarnings} />
            <FinanceMetric icon="◆" label="Total Platform Revenue" tone="purple" amount={platformRevenue} />
            <FinanceMetric icon="◷" label="Pending Payouts" tone="orange" amount={pendingPayout} />
            <FinanceMetric icon="↻" label="Refunds Processed" tone="blue" amount={refundTotal} />
          </section>

          <div className="admin-finance-overview">
            <section className="admin-panel admin-finance-summary-panel">
              <h2>Financial Overview</h2>
              <div className="admin-finance-summary-grid">
                <article><span>Customer Payment Transactions</span><strong>{transactions.length}</strong></article>
                <article><span>Provider Net Earnings</span><strong>{earnings.length}</strong></article>
                <article><span>Financial Source</span><strong>Reconciled booking outcomes</strong></article>
                <article><span>Last updated</span><strong>{latestRecordDate}</strong></article>
              </div>
            </section>
            <aside className="admin-panel admin-finance-model">
              <h2>Revenue Model</h2>
              <div className="admin-finance-rate-grid">
                <article><span>Customer Platform Fee</span><strong>{formatRate(bookings, 'platformFeeRate')}</strong><small>of Service Fee</small></article>
                <article><span>Provider-Side Commission</span><strong>{formatRate(bookings, 'providerCommissionRate')}</strong><small>of Service Fee</small></article>
              </div>
              <div className="admin-finance-total-rate"><span>Total Platform Revenue</span><strong>{(() => {
                const platform = [...new Set(bookings.map((row) => numberOrNull(row.platformFeeRate)).filter((value) => value !== null))]
                const provider = [...new Set(bookings.map((row) => numberOrNull(row.providerCommissionRate)).filter((value) => value !== null))]
                const platformRate = platform.length === 0 ? legacyRates.platformFeeRate : platform.length === 1 ? platform[0] : null
                const providerRate = provider.length === 0 ? legacyRates.providerCommissionRate : provider.length === 1 ? provider[0] : null
                return platformRate !== null && providerRate !== null ? `${platformRate + providerRate}% of Service Fee` : 'Varies by booking'
              })()}</strong></div>
              <h3>Cancellation Policy</h3>
              <p>Provider cancellation: Full refund of amount paid.</p>
              <p>Customer cancellation:</p>
              <p>More than 24 hours: 100% Service Fee Refund</p>
              <p>24 hours to 3 hours: 70% Service Fee Refund</p>
              <p>Less than 3 hours: No Service Fee Refund</p>
              <small className="admin-muted">Policy text mirrors the legacy finance page; individual outcomes use the stored booking refund fields.</small>
            </aside>
          </div>

          <FilteredTable title={`Customer Payment Transactions`} records={transactions} columns={paymentColumns} searchFields={['paymentId', 'id', 'customerName', 'customerEmail', 'provider', 'providerId', 'paymentMethod']} searchPlaceholder="Search transaction, booking, customer, or provider…" statusField="paymentStatus" search={filters.paymentSearch || ''} setSearch={(value) => updateFilter('paymentSearch', value)} status={filters.paymentStatus || 'all'} setStatus={(value) => updateFilter('paymentStatus', value)} emptyMessage="No customer payment transaction records are available." globalSearch={globalSearch} />
          <FilteredTable title="Provider Net Earnings" records={earnings} columns={earningsColumns} searchFields={['paymentId', 'provider', 'providerId', 'id', 'customerName', 'customerEmail']} searchPlaceholder="Search transaction, provider, booking, or customer…" statusField="payoutStatus" search={filters.earningsSearch || ''} setSearch={(value) => updateFilter('earningsSearch', value)} status={filters.earningsStatus || 'all'} setStatus={(value) => updateFilter('earningsStatus', value)} emptyMessage="No provider payout records are available." globalSearch={globalSearch} />
          <FilteredTable title="Commission Ledger" records={ledger} columns={ledgerColumns} searchFields={['id', 'customerName', 'customerEmail', 'provider', 'providerId']} searchPlaceholder="Search booking, customer, or provider…" search={filters.ledgerSearch || ''} setSearch={(value) => updateFilter('ledgerSearch', value)} emptyMessage="No commission ledger records are available." globalSearch={globalSearch} />
          <FilteredTable title="Refund Information" records={refunds} columns={refundColumns} searchFields={['paymentId', 'id', 'customerName', 'customerEmail', 'provider', 'providerId', 'cancellationPolicy']} searchPlaceholder="Search reference, booking, customer, or provider…" statusField="refundStatus" search={filters.refundSearch || ''} setSearch={(value) => updateFilter('refundSearch', value)} status={filters.refundStatus || 'all'} setStatus={(value) => updateFilter('refundStatus', value)} emptyMessage="No refund records are available." globalSearch={globalSearch} />

          <section className="admin-panel admin-finance-tax-panel">
            <h2>Tax Record</h2>
            <div className="admin-finance-tax-grid">
              <article><span>Tax Charged</span><strong>{taxCharged.count ? money(taxCharged.total) : 'Not available'}</strong></article>
              <article><span>Tax Refunded</span><strong>{taxRefunded.count ? money(taxRefunded.total) : 'Not available'}</strong></article>
              <article><span>Net Tax Recorded</span><strong>{taxCharged.count || taxRefunded.count ? money(taxCharged.total - taxRefunded.total) : 'Not available'}</strong></article>
              <article><span>Tax Transactions</span><strong>{taxCharged.count}</strong></article>
              <article><span>Refunded Tax Transactions</span><strong>{taxRefunded.count}</strong></article>
            </div>
          </section>
        </>}
      </section>
    </AdminAccessGate>
  )
}
