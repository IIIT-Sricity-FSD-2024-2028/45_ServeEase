import { Booking } from './booking.entity';
import { canonicalPaymentStatus, cancellationSettlement, priceBreakdown } from './booking-finance';

const booking = { serviceFee: 500, amount: 575, date: '2030-01-10', time: '10:00-12:00' } as Booking;
const hoursBefore = (hours: number) => new Date(new Date(2030, 0, 10, 10).getTime() - hours * 3600000).toISOString();

describe('booking revenue model', () => {
  it('charges tax and platform fee on top of the service fee', () => {
    expect(priceBreakdown(500)).toMatchObject({ taxAmount: 50, platformFeeAmount: 25, customerTotal: 575, providerCommissionAmount: 50, providerPayout: 450, platformRevenueAmount: 75 });
  });

  it('refunds everything when the provider cancels', () => {
    expect(cancellationSettlement(booking, 'Provider', hoursBefore(1))).toMatchObject({ cancellationPolicy: 'PROVIDER_CANCEL_FULL_REFUND', refundAmount: 575, taxRefundAmount: 50, providerPayout: 0, platformRevenueAmount: 0, payoutStatus: 'Not Paid', paymentStatus: 'Refunded' });
  });

  it('applies each customer cancellation window', () => {
    expect(cancellationSettlement(booking, 'Customer', hoursBefore(30))).toMatchObject({ cancellationPolicy: 'CUSTOMER_CANCEL_GT_24H', refundAmount: 500, providerPayout: 0, platformRevenueAmount: 25, payoutStatus: 'Not Paid' });
    expect(cancellationSettlement(booking, 'Customer', hoursBefore(10))).toMatchObject({ cancellationPolicy: 'CUSTOMER_CANCEL_24H_TO_3H', refundAmount: 350, providerCommissionAmount: 15, providerPayout: 135, platformRevenueAmount: 40, payoutStatus: 'Partially Paid' });
    expect(cancellationSettlement(booking, 'Customer', hoursBefore(1))).toMatchObject({ cancellationPolicy: 'CUSTOMER_CANCEL_LT_3H', refundAmount: 0, refundStatus: 'No Refund Due', providerPayout: 450, platformRevenueAmount: 75, payoutStatus: 'Paid' });
  });

  it('reports every payment as either Paid or Refunded', () => {
    expect(canonicalPaymentStatus({ paymentStatus: 'Successful' } as Booking)).toBe('Paid');
    expect(canonicalPaymentStatus({ paymentStatus: 'Pending' } as Booking)).toBe('Paid');
    expect(canonicalPaymentStatus({} as Booking)).toBe('Paid');
    expect(canonicalPaymentStatus({ paymentStatus: 'Paid', refundStatus: 'No Refund Due', refundAmount: 0 } as Booking)).toBe('Paid');
    expect(canonicalPaymentStatus({ paymentStatus: 'refunded' } as Booking)).toBe('Refunded');
    expect(canonicalPaymentStatus({ paymentStatus: 'Pending', refundStatus: 'Refunded' } as Booking)).toBe('Refunded');
    expect(canonicalPaymentStatus({ paymentStatus: 'Successful', refundAmount: 120 } as Booking)).toBe('Refunded');
  });
});
