// ServeEase revenue model and cancellation policy (legacy finance-engine.js), mirrored by
// back-end/src/modules/bookings/booking-finance.ts. Rates are percentages of the base service fee.
export const REVENUE_RATES = { taxRate: 10, platformFeeRate: 5, providerCommissionRate: 10 }

export const CANCELLATION_POLICIES = {
  PROVIDER_CANCEL_FULL_REFUND: 'Provider cancelled: full refund of amount paid',
  CUSTOMER_CANCEL_GT_24H: 'Customer cancelled more than 24 hours before: 100% service fee refund',
  CUSTOMER_CANCEL_24H_TO_3H: 'Customer cancelled 24 to 3 hours before: 70% service fee refund',
  CUSTOMER_CANCEL_LT_3H: 'Customer cancelled less than 3 hours before: no service fee refund',
}

export const CANCELLATION_POLICY_LINES = [
  'Provider cancellation: Full refund of amount paid.',
  'Customer cancellation:',
  'More than 24 hours: 100% Service Fee Refund',
  '24 hours to 3 hours: 70% Service Fee Refund',
  'Less than 3 hours: No Service Fee Refund',
]

export function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

const positive = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null)
const rate = (value, fallback) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? fallback : Number(value))

export function priceBreakdown(serviceFee, rates = REVENUE_RATES) {
  const taxAmount = roundCurrency(serviceFee * rates.taxRate / 100)
  const platformFeeAmount = roundCurrency(serviceFee * rates.platformFeeRate / 100)
  const providerCommissionAmount = roundCurrency(serviceFee * rates.providerCommissionRate / 100)
  return {
    serviceFee,
    ...rates,
    taxAmount,
    platformFeeAmount,
    customerTotal: roundCurrency(serviceFee + taxAmount + platformFeeAmount),
    providerCommissionAmount,
    providerPayout: roundCurrency(serviceFee - providerCommissionAmount),
    platformRevenueAmount: roundCurrency(platformFeeAmount + providerCommissionAmount),
  }
}

// Records created before the model stored a service fee only carry the charged total.
function serviceFeeOf(booking, rates) {
  const stored = positive(booking?.serviceFee)
  if (stored) return stored
  const total = positive(booking?.customerTotal ?? booking?.amount)
  if (!total) return null
  if (total > 90 && (total - 90) % 10 === 9) return roundCurrency(total - 90)
  return roundCurrency(total / (1 + (rates.taxRate + rates.platformFeeRate) / 100))
}

export function appointmentStart(dateValue, timeValue) {
  const text = String(dateValue || '')
  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  let date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
  if (!date && (match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  if (!date || Number.isNaN(date.getTime())) return null
  const clock = String(timeValue || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i)
  if (clock) {
    let hours = Number(clock[1])
    const meridiem = String(clock[3] || '').toUpperCase()
    if (meridiem === 'PM' && hours !== 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
    date.setHours(hours, Number(clock[2]), 0, 0)
  }
  return date
}

function cancellationPolicyFor(booking, byProvider) {
  if (byProvider) return 'PROVIDER_CANCEL_FULL_REFUND'
  if (CANCELLATION_POLICIES[booking.cancellationPolicy]) return booking.cancellationPolicy
  const start = appointmentStart(booking.date, booking.time)
  const cancelledAt = new Date(booking.cancelledAt || '')
  const hoursBefore = start && !Number.isNaN(cancelledAt.getTime()) ? (start.getTime() - cancelledAt.getTime()) / 3600000 : -Infinity
  if (hoursBefore > 24) return 'CUSTOMER_CANCEL_GT_24H'
  if (hoursBefore >= 3) return 'CUSTOMER_CANCEL_24H_TO_3H'
  return 'CUSTOMER_CANCEL_LT_3H'
}

// The complete money picture of one booking: what the customer paid and got back, what the
// provider earns, what the platform keeps. Returns financialsAvailable: false when no amount is known.
export function settleBooking(booking) {
  const rates = {
    taxRate: rate(booking?.taxRate, REVENUE_RATES.taxRate),
    platformFeeRate: rate(booking?.platformFeeRate, REVENUE_RATES.platformFeeRate),
    providerCommissionRate: rate(booking?.providerCommissionRate, REVENUE_RATES.providerCommissionRate),
  }
  const serviceFee = serviceFeeOf(booking, rates)
  if (serviceFee === null) return { ...booking, financialsAvailable: false }
  const charges = priceBreakdown(serviceFee, rates)
  const status = String(booking.status || '').toLowerCase()
  const settled = { ...booking, ...charges, financialsAvailable: true, refundAmount: 0, taxRefundAmount: 0, paymentStatus: 'Paid', refundStatus: '', cancellationPolicy: '', cancellationPolicyLabel: '' }

  if (status !== 'cancelled' && status !== 'rejected') {
    return { ...settled, payoutStatus: status === 'completed' ? 'Paid' : 'Pending' }
  }

  const byProvider = status === 'rejected' || String(booking.cancellationActor || '').toLowerCase() === 'provider'
  const policy = cancellationPolicyFor(booking, byProvider)
  const retainedServiceFee = policy === 'CUSTOMER_CANCEL_LT_3H' ? serviceFee : policy === 'CUSTOMER_CANCEL_24H_TO_3H' ? roundCurrency(serviceFee * 0.3) : 0
  const providerCommissionAmount = roundCurrency(retainedServiceFee * rates.providerCommissionRate / 100)
  const providerPayout = roundCurrency(retainedServiceFee - providerCommissionAmount)
  const keepsPlatformFee = !byProvider
  const taxRefundAmount = byProvider ? charges.taxAmount : 0
  const refundAmount = byProvider ? charges.customerTotal : roundCurrency(serviceFee - retainedServiceFee)
  return {
    ...settled,
    cancellationPolicy: policy,
    cancellationPolicyLabel: CANCELLATION_POLICIES[policy],
    refundAmount,
    taxRefundAmount,
    refundStatus: refundAmount > 0 ? 'Refunded' : 'No Refund Due',
    refundDate: booking.refundDate || (refundAmount > 0 ? String(booking.cancelledAt || '').slice(0, 10) : ''),
    paymentStatus: refundAmount > 0 ? 'Refunded' : 'Paid',
    providerCommissionAmount,
    providerPayout,
    platformRevenueAmount: keepsPlatformFee ? roundCurrency(charges.platformFeeAmount + providerCommissionAmount) : 0,
    payoutStatus: providerPayout === 0 ? 'Not Paid' : retainedServiceFee < serviceFee ? 'Partially Paid' : 'Paid',
  }
}

// "Net Banking - HDFC Bank" -> { method: 'Net Banking', detail: 'HDFC Bank' }.
export function paymentMethodParts(label) {
  const text = String(label || '').trim()
  if (!text || /unavailable/i.test(text)) return null
  const split = text.indexOf(' - ')
  return split === -1 ? { method: text, detail: '' } : { method: text.slice(0, split), detail: text.slice(split + 3) }
}
