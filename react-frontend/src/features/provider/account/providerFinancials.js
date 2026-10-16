import { settleBooking } from '../../finance/revenueModel.js'

const normalizeStatus = (value) => String(value || '').trim().toLowerCase()

export function projectTransaction(record) {
  const bookingStatus = normalizeStatus(record?.status)
  if (!['accepted', 'completed', 'cancelled'].includes(bookingStatus)) return null
  const settled = settleBooking(record)
  const base = { ...settled, transactionId: record?.paymentId || (record?.id ? `TXN-${String(record.id).replace(/^BOOK-/, '')}` : null), bookingRef: record?.id, customer: record?.customerName, payoutDate: record?.payoutDate || record?.receivedDate || record?.paymentDate }
  if (!settled.financialsAvailable) return { ...base, status: 'Unavailable', serviceFee: null, commission: null, payout: null }
  return { ...base, commission: settled.providerCommissionAmount, payout: settled.providerPayout, status: settled.payoutStatus }
}

export function projectTransactions(records) {
  const unique = new Map()
  ;(Array.isArray(records) ? records : []).forEach((record) => {
    const transaction = projectTransaction(record)
    if (transaction?.bookingRef && !unique.has(transaction.bookingRef)) unique.set(transaction.bookingRef, transaction)
  })
  return [...unique.values()].filter((transaction) => transaction.status !== 'Not Paid' || transaction.payout == null)
}

export function summarizeTransactions(transactions, now = new Date()) {
  const paid = transactions.filter((transaction) => ['paid', 'partially paid'].includes(normalizeStatus(transaction.status)) && transaction.payout != null)
  const pending = transactions.filter((transaction) => normalizeStatus(transaction.status) === 'pending')
  const financialsUnavailable = transactions.some((transaction) => transaction.payout == null || transaction.status === 'Unavailable')
  const totalEarnings = financialsUnavailable ? null : paid.reduce((sum, transaction) => sum + transaction.payout, 0)
  const pendingPayout = financialsUnavailable ? null : pending.reduce((sum, transaction) => sum + transaction.payout, 0)
  const earningsThisMonth = financialsUnavailable ? null : paid.filter((transaction) => {
    const dateValue = transaction.paymentDate || transaction.date
    const date = new Date(`${String(dateValue || '').slice(0, 10)}T00:00:00`)
    return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).reduce((sum, transaction) => sum + transaction.payout, 0)
  return { paid, pending, totalEarnings, pendingPayout, earningsThisMonth }
}
