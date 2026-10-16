import test from 'node:test'
import assert from 'node:assert/strict'
import { projectTransactions, projectTransaction, summarizeTransactions } from '../src/features/provider/account/providerFinancials.js'

const base = { id: 'BOOK-1', service: 'Cleaning', amount: 115, status: 'Completed', date: '2026-10-10', paymentDate: '2026-10-10' }

test('derives the service fee from a legacy customer total and applies 10 percent commission', () => {
  const transaction = projectTransaction(base)
  assert.equal(transaction.serviceFee, 100)
  assert.equal(transaction.commission, 10)
  assert.equal(transaction.payout, 90)
  assert.equal(transaction.status, 'Paid')
})

test('accepted bookings show the expected payout as pending', () => {
  const transaction = projectTransaction({ ...base, status: 'Accepted', id: 'BOOK-2' })
  assert.equal(transaction.status, 'Pending')
  assert.equal(transaction.payout, 90)
})

test('keeps financial values unavailable when the record has no usable amount', () => {
  const transaction = projectTransaction({ id: 'BOOK-missing', status: 'Completed', date: '2026-10-10' })
  assert.equal(transaction.status, 'Unavailable')
  assert.equal(transaction.payout, null)
  assert.equal(summarizeTransactions([transaction]).totalEarnings, null)
})

test('applies customer cancellation windows to the provider payout', () => {
  const cancelled = { ...base, serviceFee: 100, status: 'Cancelled', cancellationActor: 'Customer', date: '2026-10-20', time: '09:00-12:00' }
  const at = (cancelledAt) => projectTransaction({ ...cancelled, cancelledAt })
  assert.deepEqual([at('2026-10-20T08:00:00').payout, at('2026-10-20T08:00:00').status], [90, 'Paid'])
  assert.deepEqual([at('2026-10-19T20:00:00').payout, at('2026-10-19T20:00:00').commission, at('2026-10-19T20:00:00').status], [27, 3, 'Partially Paid'])
  assert.deepEqual([at('2026-10-18T00:00:00').payout, at('2026-10-18T00:00:00').status], [0, 'Not Paid'])
})

test('uses the stored cancellation policy for the legacy 899 rupee partial cancellation', () => {
  const transaction = projectTransaction({
    id: 'BOOK-20260903-1625-0009', amount: 1033.85, serviceFee: 899, status: 'Cancelled', date: '2026-09-04', time: '09:00-12:00',
    cancelledAt: '2026-09-03T10:59:26.028Z', cancellationActor: 'Customer', cancellationPolicy: 'CUSTOMER_CANCEL_24H_TO_3H', payoutStatus: 'Not Paid',
  })
  assert.equal(transaction.commission, 26.97)
  assert.equal(transaction.payout, 242.73)
  assert.equal(transaction.status, 'Partially Paid')
})

test('drops zero-payout cancellations and duplicate transactions', () => {
  const records = projectTransactions([
    { ...base, id: 'BOOK-duplicate' },
    { ...base, id: 'BOOK-duplicate', serviceFee: 80 },
    { ...base, id: 'BOOK-provider-cancel', status: 'Cancelled', cancellationActor: 'Provider' },
  ])
  assert.deepEqual(records.map((record) => record.bookingRef), ['BOOK-duplicate'])
})

test('uses payment date for current-month earnings and excludes raw pending requests', () => {
  const transactions = projectTransactions([
    { ...base, id: 'BOOK-paid', paymentDate: '2026-10-04' },
    { ...base, id: 'BOOK-pending', status: 'Pending' },
    { ...base, id: 'BOOK-old', paymentDate: '2026-09-30' },
  ])
  const summary = summarizeTransactions(transactions, new Date('2026-10-13T12:00:00'))
  assert.equal(summary.pending.length, 0)
  assert.equal(summary.earningsThisMonth, 90)
})
