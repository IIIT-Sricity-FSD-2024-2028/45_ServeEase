import { canonicalProviderId } from '../../common/provider-identity';
import { StateRepository } from '../state/state.repository';

// Customer ratings of completed bookings. This is the server-side form of the original front end's
// reviews.js (localStorage "serveEaseBookingReviews"): one review per booking, a 1-5 rating and optional
// feedback, with provider averages computed from the stored reviews rather than saved anywhere.
export const REVIEWS_KEY = 'serveEaseBookingReviews';

export type Review = {
  bookingId: string;
  providerId: string;
  providerName: string;
  customerId: string;
  rating: number;
  feedback: string;
  createdAt: string;
  updatedAt?: string;
};
type Account = Record<string, any>;

// reviews.js providerKey: ids and names that differ only in case, punctuation or a trailing "s" are one provider.
export const providerKey = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/s$/, '');

export function readReviews(state: StateRepository): Review[] {
  const reviews = (state.findById(REVIEWS_KEY)?.value as { reviews?: unknown } | undefined)?.reviews;
  return Array.isArray(reviews) ? (reviews as Review[]) : [];
}

export function writeReviews(state: StateRepository, reviews: Review[]) {
  const value = { reviews };
  if (state.findById(REVIEWS_KEY)) state.update(REVIEWS_KEY, { value });
  else state.create({ key: REVIEWS_KEY, value });
}

const reviewKeys = (review: Review) => [providerKey(review.providerId), providerKey(canonicalProviderId(review.providerId)), providerKey(review.providerName)].filter(Boolean);

export function matchesProvider(review: Review, keys: string[]) {
  const wanted = new Set(keys.filter(Boolean));
  return reviewKeys(review).some((key) => wanted.has(key));
}

// Every identity a listing answers to: its own id, its owner account id and the name customers see.
export const listingKeys = (listing: Account) => [listing?.id, listing?.ownerProviderId, canonicalProviderId(String(listing?.ownerProviderId || '')), listing?.name].map(providerKey).filter(Boolean);

export function providerKeys(account: Account | undefined, principal: { userId: string; providerCatalogId?: string }) {
  return [principal.userId, canonicalProviderId(principal.userId), principal.providerCatalogId, account?.providerCatalogId, account?.organisationName].map(providerKey).filter(Boolean);
}

export function statsFor(reviews: Review[], keys: string[]) {
  const mine = reviews.filter((review) => matchesProvider(review, keys));
  const total = mine.length;
  return { total, average: total ? mine.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total : 0 };
}

const demoFeedback = ['Professional and punctual.', 'Excellent service.', 'Highly recommended.', 'Quick and clean work.', 'Very satisfied.', 'Good experience.'];
const demoRatings = [5, 5, 4, 3, 5, 5, 5, 4, 4, 5];

// The original seeded sample reviews for completed bookings (seedCompletedBookings). The same sample data is
// created once, the first time the review record exists, for bookings that are already completed; any booking
// completed later gets a review only when its customer writes one.
export function seedDemoReviews(state: StateRepository, bookings: Array<Record<string, any>>) {
  if (state.findById(REVIEWS_KEY)) return;
  const completed = bookings.filter((booking) => String(booking.status || '').toLowerCase() === 'completed');
  writeReviews(state, completed.map((booking, index): Review => ({
    bookingId: String(booking.id),
    providerId: canonicalProviderId(String(booking.providerId || '')),
    providerName: String(booking.provider || ''),
    customerId: String(booking.customerId || ''),
    rating: demoRatings[index % demoRatings.length],
    feedback: demoFeedback[index % demoFeedback.length],
    createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  })));
}
