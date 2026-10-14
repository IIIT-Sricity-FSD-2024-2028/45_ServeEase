const DEFAULT_COMMISSION_RATE = 10
const SUPPORTED_PAYOUT_STATUSES = new Set(['pending', 'paid', 'partially paid', 'not paid', 'failed', 'cancelled', 'refunded'])

export function roundCurrency(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : null
}

export function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeServiceFee(record) {
  const explicit = Number(record?.serviceFee)
  if (Number.isFinite(explicit) && explicit > 0) return roundCurrency(explicit)
  const raw = Number(record?.amount ?? record?.customerTotal)
  if (!Number.isFinite(raw) || raw <= 0) return null
  if (raw > 90 && (raw - 90) % 10 === 9) return roundCurrency(raw - 90)
  return roundCurrency(raw / 1.15)
}

function parseAppointmentAt(dateValue, timeValue) {
  const dateMatch = String(dateValue || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  const date = dateMatch ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])) : new Date(dateValue || '')
  if (Number.isNaN(date.getTime())) return null
  const timeMatch = String(timeValue || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i)
  if (!timeMatch) return date
  let hour = Number(timeMatch[1]); const minute = Number(timeMatch[2]); const meridiem = String(timeMatch[3] || '').toUpperCase()
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  date.setHours(hour, minute, 0, 0)
  return date
}

export function cancellationPayout(record, serviceFee, commissionRate = DEFAULT_COMMISSION_RATE) {
  const appointment = parseAppointmentAt(record?.date, record?.time)
  const cancelledAt = new Date(record?.cancelledAt || '')
  const actor = normalizeStatus(record?.cancellationActor) === 'provider' ? 'provider' : 'customer'
  if (actor === 'provider') return { payout: 0, commission: 0, status: 'Not Paid' }
  if (!appointment || Number.isNaN(cancelledAt.getTime())) return null
  const hoursBefore = (appointment.getTime() - cancelledAt.getTime()) / 3600000
  const retainedRate = hoursBefore > 24 ? 0 : hoursBefore >= 3 ? 0.3 : 1
  const retainedServiceFee = roundCurrency(serviceFee * retainedRate) ?? 0
  const commission = roundCurrency(retainedServiceFee * (Number(commissionRate) || DEFAULT_COMMISSION_RATE) / 100) ?? 0
  const payout = roundCurrency(retainedServiceFee - commission) ?? 0
  return { payout, commission, status: payout === 0 ? 'Not Paid' : retainedRate < 1 ? 'Partially Paid' : 'Paid' }
}

function explicitStatus(record) {
  const value = String(record?.payoutStatus || '').trim()
  return SUPPORTED_PAYOUT_STATUSES.has(normalizeStatus(value)) ? value : ''
}

export function projectTransaction(record) {
  const bookingStatus = normalizeStatus(record?.status)
  if (!['accepted', 'completed', 'cancelled'].includes(bookingStatus)) return null
  const serviceFee = normalizeServiceFee(record)
  if (serviceFee == null) return { ...record, bookingRef: record?.id, status: explicitStatus(record) || 'Unavailable', serviceFee: null, commission: null, payout: null }
  const commissionRate = Number(record?.providerCommissionRate) || DEFAULT_COMMISSION_RATE
  let payout = record?.providerPayoutAmount != null ? Number(record.providerPayoutAmount) : record?.providerPayout != null ? Number(record.providerPayout) : null
  let commission = record?.providerCommissionAmount != null ? Number(record.providerCommissionAmount) : null
  let derivedStatus = explicitStatus(record)
  if (bookingStatus === 'cancelled') {
    const cancellation = cancellationPayout(record, serviceFee, commissionRate)
    if (cancellation) { payout = cancellation.payout; commission = cancellation.commission; derivedStatus = cancellation.status }
    else if (!derivedStatus) derivedStatus = 'Unavailable'
  }
  if (payout == null && bookingStatus !== 'cancelled') payout = roundCurrency(serviceFee * (1 - commissionRate / 100))
  if (commission == null && payout != null) commission = roundCurrency(serviceFee - payout)
  if (!derivedStatus) derivedStatus = bookingStatus === 'completed' ? 'Paid' : 'Pending'
  return { ...record, transactionId: record?.paymentId || null, bookingRef: record?.id, customer: record?.customerName, serviceFee, commission, payout, status: derivedStatus, payoutDate: record?.payoutDate || record?.receivedDate || record?.paymentDate }
}

export function projectTransactions(records) {
  const unique = new Map()
  ;(Array.isArray(records) ? records : []).forEach((record) => {
    const transaction = projectTransaction(record)
    if (transaction?.bookingRef && !unique.has(transaction.bookingRef)) unique.set(transaction.bookingRef, transaction)
  })
  return [...unique.values()].filter((transaction) => transaction.status !== 'Not Paid' || transaction.payout > 0 || transaction.payout == null)
}

export function summarizeTransactions(transactions, now = new Date()) {
  const paid = transactions.filter((transaction) => ['paid', 'partially paid'].includes(normalizeStatus(transaction.status)) && transaction.payout != null)
  const pending = transactions.filter((transaction) => normalizeStatus(transaction.status) === 'pending')
  const financialsUnavailable = transactions.some((transaction) => transaction.payout == null || transaction.serviceFee == null || transaction.status === 'Unavailable')
  const totalEarnings = financialsUnavailable ? null : paid.reduce((sum, transaction) => sum + transaction.payout, 0)
  const pendingPayout = financialsUnavailable ? null : pending.reduce((sum, transaction) => sum + (transaction.payout || 0), 0)
  const earningsThisMonth = financialsUnavailable ? null : paid.filter((transaction) => {
    const dateValue = transaction.paymentDate || transaction.date
    const date = new Date(`${String(dateValue || '').slice(0, 10)}T00:00:00`)
    return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).reduce((sum, transaction) => sum + transaction.payout, 0)
  return { paid, pending, totalEarnings, pendingPayout, earningsThisMonth }
}
