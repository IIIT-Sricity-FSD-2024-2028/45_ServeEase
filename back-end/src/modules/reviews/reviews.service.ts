import { ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { canonicalProviderId } from '../../common/provider-identity';
import { BookingsRepository } from '../bookings/bookings.repository';
import { CatalogService } from '../catalog/catalog.service';
import { StateRepository } from '../state/state.repository';
import { SaveReviewDto } from './reviews.dto';
import { Review, listingKeys, matchesProvider, providerKeys, readReviews, seedDemoReviews, statsFor, writeReviews } from './reviews.store';

type Principal = { userId: string; role: string; email: string; providerCatalogId?: string };

const byNewest = (left: Review, right: Review) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt));

@Injectable()
export class ReviewsService implements OnModuleInit {
  constructor(private readonly state: StateRepository, private readonly bookings: BookingsRepository, private readonly catalog: CatalogService) {}

  onModuleInit() {
    seedDemoReviews(this.state, this.bookings.findAll());
  }

  // The caller's own reviews, newest first (customers see their reviews on My Bookings).
  mine(principal: Principal) {
    return readReviews(this.state).filter((review) => review.customerId === principal.userId).sort(byNewest);
  }

  // Only the customer who made a completed booking can rate it; saving again edits the same review.
  save(principal: Principal, bookingId: string, input: SaveReviewDto): Review {
    const booking = this.bookings.findById(bookingId);
    const ownsBooking = booking && (String(booking.customerId || '') === principal.userId || (principal.email && String(booking.customerEmail || '').toLowerCase() === principal.email));
    if (!booking || !ownsBooking) throw new NotFoundException(`Booking with id "${bookingId}" was not found.`);
    if (String(booking.status || '').toLowerCase() !== 'completed') throw new ConflictException('Only completed bookings can be rated.');
    const reviews = readReviews(this.state);
    const existing = reviews.find((review) => review.bookingId === booking.id);
    const now = new Date().toISOString();
    const saved: Review = {
      bookingId: booking.id,
      providerId: canonicalProviderId(String(booking.providerId || '')),
      providerName: String(booking.provider || ''),
      customerId: String(booking.customerId || principal.userId),
      rating: input.rating,
      feedback: String(input.feedback || '').trim(),
      createdAt: existing?.createdAt || now,
      ...(existing ? { updatedAt: now } : {}),
    };
    writeReviews(this.state, existing ? reviews.map((review) => (review === existing ? saved : review)) : [...reviews, saved]);
    return saved;
  }

  // The signed-in provider's reviews and average (profile page, booking details).
  forProvider(principal: Principal) {
    const account = this.account(principal.userId);
    const keys = providerKeys(account, principal);
    const reviews = readReviews(this.state).filter((review) => matchesProvider(review, keys)).sort(byNewest);
    return { ...statsFor(reviews, keys), reviews };
  }

  // What customers see on a provider's page: the average and the latest reviews, without customer identity.
  forListing(listingId: string) {
    const listing = this.catalog.findAll().providers.find((candidate) => candidate.id === listingId);
    if (!listing) throw new NotFoundException(`Provider with id "${listingId}" was not found.`);
    const keys = listingKeys(listing);
    const reviews = readReviews(this.state).filter((review) => matchesProvider(review, keys)).sort(byNewest);
    return { ...statsFor(reviews, keys), reviews: reviews.slice(0, 3).map(({ rating, feedback, createdAt }) => ({ rating, feedback, createdAt })) };
  }

  assertCustomer(principal: Principal) {
    if (principal.role !== 'customer') throw new ForbiddenException('Only customers can rate a booking.');
  }

  private account(userId: string): Record<string, any> | undefined {
    const users = (this.state.findById('serveEaseData')?.value as { users?: Array<Record<string, any>> } | undefined)?.users;
    return (Array.isArray(users) ? users : []).find((user) => user?.role === 'provider' && String(user.id) === userId);
  }
}
