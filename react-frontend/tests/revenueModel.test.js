import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentMethodParts, priceBreakdown, settleBooking } from '../src/features/finance/revenueModel.js'

const booking = { id: 'BOOK-500', serviceFee: 500, date: '2030-01-10', time: '10:00-12:00' }
const cancelledBefore = (hours, actor = 'Customer') => settleBooking({
  ...booking, status: 'Cancelled', cancellationActor: actor,
  cancelledAt: new Date(new Date(2030, 0, 10, 10).getTime() - hours * 3600000).toISOString(),
})
const split = (row) => ({ refund: row.refundAmount, provider: row.providerPayout, platform: row.platformRevenueAmount, tax: row.taxAmount - row.taxRefundAmount })

test('a 500 rupee service charges tax and platform fee on top', () => {
  assert.deepEqual(priceBreakdown(500), {
    serviceFee: 500, taxRate: 10, platformFeeRate: 5, providerCommissionRate: 10, taxAmount: 50, platformFeeAmount: 25,
    customerTotal: 575, providerCommissionAmount: 50, providerPayout: 450, platformRevenueAmount: 75,
  })
})

test('completed and open bookings split the 575 rupee payment', () => {
  assert.deepEqual(split(settleBooking({ ...booking, status: 'Completed' })), { refund: 0, provider: 450, platform: 75, tax: 50 })
  assert.equal(settleBooking({ ...booking, status: 'Accepted' }).payoutStatus, 'Pending')
})

test('cancellation windows for a 500 rupee service', () => {
  assert.deepEqual(split(cancelledBefore(1, 'Provider')), { refund: 575, provider: 0, platform: 0, tax: 0 })
  assert.deepEqual(split(settleBooking({ ...booking, status: 'Rejected' })), { refund: 575, provider: 0, platform: 0, tax: 0 })
  assert.deepEqual(split(cancelledBefore(30)), { refund: 500, provider: 0, platform: 25, tax: 50 })
  assert.deepEqual(split(cancelledBefore(10)), { refund: 350, provider: 135, platform: 40, tax: 50 })
  assert.deepEqual(split(cancelledBefore(1)), { refund: 0, provider: 450, platform: 75, tax: 50 })
  assert.equal(cancelledBefore(10).paymentStatus, 'Refunded')
  assert.equal(cancelledBefore(1).refundStatus, 'No Refund Due')
})

test('payment method labels split into method and bank, app or card detail', () => {
  assert.deepEqual(paymentMethodParts('Net Banking - HDFC Bank'), { method: 'Net Banking', detail: 'HDFC Bank' })
  assert.deepEqual(paymentMethodParts('Credit / Debit Card - XXXX 3456'), { method: 'Credit / Debit Card', detail: 'XXXX 3456' })
  assert.equal(paymentMethodParts('Payment method unavailable'), null)
  assert.equal(paymentMethodParts(undefined), null)
})
