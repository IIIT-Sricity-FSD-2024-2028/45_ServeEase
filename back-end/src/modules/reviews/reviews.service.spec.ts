import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { listingKeys, providerKey, readReviews, seedDemoReviews, statsFor } from './reviews.store';

function setup(bookings: Array<Record<string, any>>, preset?: unknown) {
  const entries = new Map<string, { value: unknown }>();
  if (preset) entries.set('serveEaseBookingReviews', { value: preset });
  entries.set('serveEaseData', { value: { users: [{ id: 'PRO001', role: 'provider', organisationName: 'Cleanpro Services', providerCatalogId: 'cleanpro-service' }] } });
  const state = {
    findById: (key: string) => entries.get(key),
    create: ({ key, value }: { key: string; value: unknown }) => { entries.set(key, { value }); },
    update: (key: string, { value }: { value: unknown }) => { entries.set(key, { value }); },
  };
  const repository = { findAll: () => bookings, findById: (id: string) => bookings.find((booking) => booking.id === id) };
  const catalog = { findAll: () => ({ providers: [{ id: 'cleanpro-service-home-cleaning-1', name: 'Cleanpro Services', ownerProviderId: 'PRO001' }] }) };
  return { state, service: new ReviewsService(state as never, repository as never, catalog as never) };
}

const completed = { id: 'BOOK-1', status: 'Completed', providerId: 'PRO001', provider: 'Cleanpro Services', customerId: 'CUS001', customerEmail: 'c@example.com' };
const customer = { userId: 'CUS001', role: 'customer', email: 'c@example.com' };

describe('provider keys', () => {
  it('treats case, punctuation and a trailing s as the same provider (reviews.js providerKey)', () => {
    expect(providerKey('Cleanpro Services')).toBe('cleanpro-service');
    expect(listingKeys({ id: 'cleanpro-service-home-cleaning-1', ownerProviderId: 'PRO001', name: 'Cleanpro Services' })).toContain('cleanpro-service');
  });
});

describe('sample reviews', () => {
  it('are created once for bookings that are already completed, and never again', () => {
    const { state } = setup([completed, { ...completed, id: 'BOOK-2' }, { ...completed, id: 'BOOK-3', status: 'Cancelled' }]);
    seedDemoReviews(state as never, [completed, { ...completed, id: 'BOOK-2' }, { ...completed, id: 'BOOK-3', status: 'Cancelled' }]);
    expect(readReviews(state as never).map((review) => [review.bookingId, review.rating])).toEqual([['BOOK-1', 5], ['BOOK-2', 5]]);
    seedDemoReviews(state as never, [{ ...completed, id: 'BOOK-9' }]);
    expect(readReviews(state as never)).toHaveLength(2);
  });
});

describe('customer reviews', () => {
  it('lets the booking customer rate once, edit it, and feeds the provider average', () => {
    const { service, state } = setup([completed], { reviews: [] });
    service.save(customer, 'BOOK-1', { rating: 4, feedback: ' Good ' });
    service.save(customer, 'BOOK-1', { rating: 2, feedback: 'Changed my mind' });
    const stored = readReviews(state as never);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ rating: 2, feedback: 'Changed my mind', providerId: 'PRO001', customerId: 'CUS001' });
    expect(stored[0].updatedAt).toBeDefined();
    expect(service.mine(customer)).toHaveLength(1);
    expect(service.forProvider({ userId: 'PRO001', role: 'provider', email: 'p@example.com' })).toMatchObject({ total: 1, average: 2 });
    expect(service.forListing('cleanpro-service-home-cleaning-1')).toMatchObject({ total: 1, average: 2, reviews: [{ rating: 2, feedback: 'Changed my mind' }] });
    expect(statsFor(stored, listingKeys({ id: 'someone-else', name: 'Someone Else' }))).toMatchObject({ total: 0, average: 0 });
  });

  it('refuses other customers, bookings that are not completed, and unknown listings', () => {
    const { service } = setup([completed, { ...completed, id: 'BOOK-2', status: 'Accepted' }], { reviews: [] });
    expect(() => service.save({ userId: 'CUS002', role: 'customer', email: 'x@example.com' }, 'BOOK-1', { rating: 5 })).toThrow(NotFoundException);
    expect(() => service.save(customer, 'BOOK-2', { rating: 5 })).toThrow(ConflictException);
    expect(() => service.save(customer, 'BOOK-404', { rating: 5 })).toThrow(NotFoundException);
    expect(() => service.forListing('nope')).toThrow(NotFoundException);
  });
});
