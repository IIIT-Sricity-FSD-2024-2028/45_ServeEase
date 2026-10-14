import test from 'node:test'
import assert from 'node:assert/strict'
import { cancellationPayout, normalizeServiceFee, projectTransactions, projectTransaction, summarizeTransactions } from '../src/features/provider/account/providerFinancials.js'

const base = { id: 'BOOK-1', service: 'Cleaning', amount: 115, status: 'Completed', date: '2026-10-10', paymentDate: '2026-10-10' }

test('normalizes customer total to service fee and applies 10 percent commission', () => {
  const transaction = projectTransaction(base)
  assert.equal(normalizeServiceFee(base), 100)
  assert.equal(transaction.serviceFee, 100)
  assert.equal(transaction.commission, 10)
  assert.equal(transaction.payout, 90)
})

test('derives accepted pending payout without treating missing payout as zero', () => {
  const transaction = projectTransaction({ ...base, status: 'Accepted', id: 'BOOK-2' })
  assert.equal(transaction.status, 'Pending')
  assert.equal(transaction.payout, 90)
  assert.equal(transaction.commission, 10)
})

test('keeps financial values unavailable when the record has no usable amount', () => {
  const transaction = projectTransaction({ id: 'BOOK-missing', status: 'Completed', date: '2026-10-10' })
  assert.equal(transaction.status, 'Unavailable')
  assert.equal(transaction.serviceFee, null)
  assert.equal(transaction.payout, null)
  assert.equal(summarizeTransactions([transaction]).totalEarnings, null)
})

test('preserves explicit payout statuses', () => {
  for (const status of ['Not Paid', 'Failed', 'Cancelled', 'Refunded']) {
    const transaction = projectTransaction({ ...base, id: status, payoutStatus: status })
    assert.equal(transaction.status, status)
  }
})

test('applies customer cancellation windows', () => {
  const service = { ...base, status: 'Cancelled', cancellationActor: 'Customer', date: '2026-10-20' }
  assert.deepEqual(cancellationPayout({ ...service, cancelledAt: '2026-10-19T00:00:00Z' }, 100), { payout: 27, commission: 3, status: 'Partially Paid' })
  assert.deepEqual(cancellationPayout({ ...service, cancelledAt: '2026-10-19T22:00:00Z' }, 100), { payout: 90, commission: 10, status: 'Paid' })
  assert.deepEqual(cancellationPayout({ ...service, cancelledAt: '2026-10-18T00:00:00Z' }, 100), { payout: 0, commission: 0, status: 'Not Paid' })
})

test('classifies the legacy 899 rupee partial cancellation from authoritative cancellation fields', () => {
  const transaction = projectTransaction({
    id: 'BOOK-20260903-1625-0009',
    amount: 1033.85,
    serviceFee: 899,
    providerCommissionRate: 10,
    providerCommissionAmount: 26.97,
    providerPayout: 242.73,
    status: 'Cancelled',
    date: '2026-09-04',
    time: '09:00-12:00',
    cancelledAt: '2026-09-03T10:59:26.028',
    cancellationActor: 'Customer',
    cancellationPolicy: 'CUSTOMER_CANCEL_24H_TO_3H',
    payoutStatus: 'Not Paid',
  })

  assert.equal(transaction.serviceFee, 899)
  assert.equal(transaction.commission, 26.97)
  assert.equal(transaction.payout, 242.73)
  assert.equal(transaction.status, 'Partially Paid')
})

test('applies provider cancellation and does not create duplicate transactions', () => {
  assert.deepEqual(cancellationPayout({ cancellationActor: 'Provider' }, 100), { payout: 0, commission: 0, status: 'Not Paid' })
  const records = projectTransactions([{ ...base, id: 'BOOK-duplicate' }, { ...base, id: 'BOOK-duplicate', providerPayout: 80 }])
  assert.equal(records.length, 1)
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
