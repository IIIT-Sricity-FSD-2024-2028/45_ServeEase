import { Booking } from './booking.entity';

// Legacy finance-engine.js revenue model. Every rate is a percentage of the base service fee.
export const REVENUE_RATES = { taxRate: 10, platformFeeRate: 5, providerCommissionRate: 10 };

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function priceBreakdown(serviceFee: number) {
  const { taxRate, platformFeeRate, providerCommissionRate } = REVENUE_RATES;
  const taxAmount = round(serviceFee * taxRate / 100);
  const platformFeeAmount = round(serviceFee * platformFeeRate / 100);
  const providerCommissionAmount = round(serviceFee * providerCommissionRate / 100);
  const providerPayout = round(serviceFee - providerCommissionAmount);
  return {
    serviceFee,
    taxRate,
    taxAmount,
    platformFeeRate,
    platformFeeAmount,
    customerTotal: round(serviceFee + taxAmount + platformFeeAmount),
    providerCommissionRate,
    providerCommissionAmount,
    providerPayout,
    providerPayoutAmount: providerPayout,
    platformRevenueAmount: round(platformFeeAmount + providerCommissionAmount),
  };
}

function appointmentStart(date: string, time: string): Date | undefined {
  const day = String(date || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!day) return undefined;
  const start = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const clock = String(time || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (clock) {
    let hours = Number(clock[1]);
    const meridiem = String(clock[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    start.setHours(hours, Number(clock[2]), 0, 0);
  }
  return start;
}

// Refund, payout and revenue for a cancelled or rejected booking, per the legacy cancellation policy.
export function cancellationSettlement(booking: Booking, actor: string, cancelledAt: string) {
  const serviceFee = Number(booking.serviceFee ?? booking.amount) || 0;
  const charges = priceBreakdown(serviceFee);
  const byProvider = actor === 'Provider';
  const start = appointmentStart(booking.date, booking.time);
  const hoursBefore = start ? (start.getTime() - new Date(cancelledAt).getTime()) / 3600000 : -Infinity;

  let policy = 'CUSTOMER_CANCEL_LT_3H';
  let retainedServiceFee = serviceFee;
  if (byProvider) { policy = 'PROVIDER_CANCEL_FULL_REFUND'; retainedServiceFee = 0; }
  else if (hoursBefore > 24) { policy = 'CUSTOMER_CANCEL_GT_24H'; retainedServiceFee = 0; }
  else if (hoursBefore >= 3) { policy = 'CUSTOMER_CANCEL_24H_TO_3H'; retainedServiceFee = round(serviceFee * 0.3); }

  const keepsPlatformFee = !byProvider;
  const providerCommissionAmount = round(retainedServiceFee * charges.providerCommissionRate / 100);
  const providerPayout = round(retainedServiceFee - providerCommissionAmount);
  const refundServiceFee = round(serviceFee - retainedServiceFee);
  const refundTax = byProvider ? charges.taxAmount : 0;
  const refundPlatformFee = byProvider ? charges.platformFeeAmount : 0;
  const refundAmount = round(refundServiceFee + refundTax + refundPlatformFee);

  return {
    cancellationPolicy: policy,
    refundAmount,
    refundServiceFee,
    refundPlatformFee,
    refundTax,
    taxRefundAmount: refundTax,
    refundStatus: refundAmount > 0 ? 'Refunded' : 'No Refund Due',
    ...(refundAmount > 0 ? { refundDate: cancelledAt.slice(0, 10), paymentStatus: 'Refunded' } : {}),
    providerCommissionAmount,
    providerPayout,
    providerPayoutAmount: providerPayout,
    platformRevenueAmount: keepsPlatformFee ? round(charges.platformFeeAmount + providerCommissionAmount) : 0,
    payoutStatus: providerPayout === 0 ? 'Not Paid' : retainedServiceFee < serviceFee ? 'Partially Paid' : 'Paid',
  };
}

// There is no payment gateway (pressing Pay at checkout *is* the payment), so a booking's money is either
// still with ServeEase ('Paid') or has gone back to the customer ('Refunded'). Legacy records carry other
// words for the same two states ('Successful', 'Pending'); this collapses them so every page agrees.
export const PAYMENT_STATUSES = ['Paid', 'Refunded'] as const;

export function canonicalPaymentStatus(booking: Partial<Booking>): 'Paid' | 'Refunded' {
  const refunded = String(booking?.refundStatus || '').trim().toLowerCase() === 'refunded'
    || Number(booking?.refundAmount) > 0
    || String(booking?.paymentStatus || '').trim().toLowerCase() === 'refunded';
  return refunded ? 'Refunded' : 'Paid';
}
