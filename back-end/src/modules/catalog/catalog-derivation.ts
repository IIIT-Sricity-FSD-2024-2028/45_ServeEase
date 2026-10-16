import { canonicalProviderId } from '../../common/provider-identity';
import { providerAccountStatus, providerVerificationStatus } from '../../common/provider-account-status';
import { profilePhotoPath } from '../provider-documents/profile-photo';
import { CatalogCategory, CatalogProvider } from './catalog.entity';
import { CATEGORY_IMAGES } from './catalog-snapshot';

type Account = Record<string, any>;

// What the catalog shows of a provider account is decided by the account, not by the listing snapshot a
// front end last synced. This module applies that to the listings (authoritative status) and builds a
// listing for a verified provider who has active services but none yet. It is pure: the catalog repository
// runs it on every read, so approval, rejection, suspension, reactivation and service changes show at once,
// with no restart and no second catalog.
const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();
const slug = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export interface DerivationInput {
  users: Account[];
  categories: CatalogCategory[];
  providers: CatalogProvider[];
  servicesFor: (providerId: string) => Account[];
  // True when the account has a stored profile-photo image that can be shown on its listing.
  hasPhoto?: (account: Account) => boolean;
  // Average rating and review count computed from the stored customer reviews of a listing.
  ratingFor?: (listing: CatalogProvider) => { average: number; total: number };
}

// The provider account that owns a listing. A few legacy ids are shared by two accounts; the listing's owner
// email then decides, and an owner that cannot be decided is left alone rather than guessed.
export function ownerAccount(listing: Pick<CatalogProvider, 'ownerProviderId' | 'ownerProviderEmail'>, providers: Account[]): Account | undefined {
  const id = String(listing.ownerProviderId || '').trim();
  if (!id) return undefined;
  let matches = providers.filter((account) => String(account.id) === id);
  if (matches.length > 1 && listing.ownerProviderEmail) matches = matches.filter((account) => lower(account.email) === lower(listing.ownerProviderEmail));
  return matches.length === 1 ? matches[0] : undefined;
}

// The synced listings that belong to a provider account: the listing named by its providerCatalogId (exactly,
// exactly, which always counts, or as the base id of `<base>-<category>-<city>` when no other account owns it), or one that names the account as its owner. Where an id is
// shared by two accounts the owner email must also agree, so one account never takes the other's listing.
export function listingsOfAccount(account: Account, accounts: Account[], listings: CatalogProvider[]): CatalogProvider[] {
  const shared = accounts.filter((candidate) => String(candidate.id) === String(account.id)).length > 1;
  const catalogId = String(account.providerCatalogId || '').trim();
  const sameOwner = (listing: CatalogProvider) => !listing.ownerProviderEmail || lower(listing.ownerProviderEmail) === lower(account.email);
  return listings.filter((listing) => {
    const owned = Boolean(listing.ownerProviderId) && String(listing.ownerProviderId) === String(account.id) && (!shared || Boolean(listing.ownerProviderEmail) && sameOwner(listing));
    if (owned) return true;
    if (!catalogId) return false;
    if (listing.id === catalogId) return true;
    const foreignOwner = Boolean(listing.ownerProviderId) && String(listing.ownerProviderId) !== String(account.id) && !sameOwner(listing);
    return !foreignOwner && listing.id.startsWith(`${catalogId}-`);
  });
}

export interface AccountService { id: string | null; name: string; category: string | null; price: number | null; location: string | null; status: string | null }

// The services a provider account has. The saved service records are authoritative; a listing's own service list
// (the legacy sync) is read only when the account has no records, and never for an id shared by two accounts,
// whose id-keyed records cannot be told apart.
export function accountServices(account: Account, accounts: Account[], listings: CatalogProvider[], records: Account[]): AccountService[] {
  const shared = accounts.filter((candidate) => String(candidate.id) === String(account.id)).length > 1;
  const clean = (value: unknown) => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());
  const price = (value: unknown) => (value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
  if (!shared && records.length) {
    return records.map((record) => ({ id: clean(record.id), name: String(record.name ?? record.serviceName ?? ''), category: clean(record.category), price: price(record.price), location: clean(record.location || record.cityName), status: clean(record.status) || (record.isActive === false ? 'Inactive' : 'Active') })).filter((service) => service.name);
  }
  const seen = new Set<string>();
  const result: AccountService[] = [];
  listingsOfAccount(account, accounts, listings).forEach((listing) => {
    const own = Array.isArray(listing.services) && listing.services.length
      ? listing.services.map((service: Account) => ({ id: clean(service.id), name: String(service.name ?? service.serviceName ?? ''), category: clean(service.category || listing.category), price: price(service.price), location: clean(service.location || listing.location), status: clean(service.status) }))
      : (listing.subServices || []).map((name) => ({ id: null, name: String(name), category: clean(listing.category), price: price(listing.servicePricing?.[name] ?? listing.startingPrice), location: clean(listing.location), status: listing.verified === false ? 'Pending' : 'Active' }));
    own.forEach((service) => {
      const key = `${service.category}|${lower(service.name)}|${listing.cityId}`;
      if (!service.name || seen.has(key)) return;
      seen.add(key);
      result.push(service);
    });
  });
  return result;
}

export function listingOwner(listing: CatalogProvider, accounts: Account[]): Account | undefined {
  return ownerAccount(listing, accounts) || (listing.ownerProviderId ? undefined : uniqueByCatalogId(listing, accounts));
}

function uniqueByCatalogId(listing: Pick<CatalogProvider, 'id'>, accounts: Account[]): Account | undefined {
  const matches = accounts.filter((account) => String(account.providerCatalogId || '').trim() === listing.id);
  return matches.length === 1 ? matches[0] : undefined;
}

function categoryId(value: unknown, categories: CatalogCategory[]): string | undefined {
  const wanted = slug(value);
  if (!wanted) return undefined;
  const aliased = wanted === 'cleaning-services' ? 'home-cleaning' : wanted;
  return categories.find((category) => slug(category.id) === aliased || slug(category.name) === aliased)?.id;
}

function overlay(listing: CatalogProvider, account: Account): CatalogProvider {
  const status = providerAccountStatus(account);
  const live = status === 'Active' || status === 'Suspended';
  return {
    ...listing,
    // The provider edits the organisation name on their account; customers see it on the listing.
    name: String(account.organisationName || '').trim() || listing.name,
    // Seed listings carry no owner id, so everything keyed on a provider (availability above all) was keyed
    // on the listing id while the provider's own pages used their account id, and the two never met. The
    // resolved owner is named on the listing so one provider has one identity everywhere.
    ownerProviderId: String(account.id),
    ownerProviderEmail: lower(account.email) || listing.ownerProviderEmail,
    accountStatus: status,
    approvalStatus: String(account.approvalStatus || status),
    verificationStatus: account.verificationStatus || providerVerificationStatus(status) || undefined,
    // A pending, rejected or otherwise unverified account is never presented as verified; a suspended one
    // stays verified but is hidden and refused through its account status.
    verified: live ? listing.verified : false,
  } as CatalogProvider;
}

// One listing's active services, taken from the provider's saved service records: the records a customer can
// actually book in that listing's category and city. Returned in record order, one entry per service name.
function listingServices(listing: CatalogProvider, account: Account, records: Account[], categories: CatalogCategory[]): Account[] {
  const seen = new Set<string>();
  const services: Account[] = [];
  records.forEach((service) => {
    const price = Number(service?.price);
    if (!service?.name || !Number.isFinite(price) || price <= 0) return;
    if (String(service.status ?? 'Active') === 'Inactive' || service.isActive === false) return;
    const category = categoryId(service.category || account.serviceType, categories) || listing.category;
    if (category !== listing.category) return;
    const cityId = Number(service.cityId ?? account.cityId);
    const listingCity = Number(listing.cityId);
    if (Number.isInteger(cityId) && cityId > 0 && Number.isInteger(listingCity) && listingCity > 0 && cityId !== listingCity) return;
    const name = String(service.name).trim();
    const key = lower(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    services.push({ id: service.id, name, category: service.category || category, description: service.description, duration: service.duration, price, status: 'Active' });
  });
  return services;
}

// A listing shows what the provider currently offers, not the service list a front end last synced: the saved
// records decide its services, prices and starting price, so adding, renaming, repricing or deactivating a
// service in Manage Services shows on the customer pages at once. A listing left with no active service has
// nothing to book and drops out of discovery, which is what the provider asked for by deactivating them all.
function withRecordedServices(listing: CatalogProvider, account: Account, records: Account[], categories: CatalogCategory[]): CatalogProvider {
  if (!records.length) return listing;
  const services = listingServices(listing, account, records, categories);
  return {
    ...listing,
    subServices: services.map((service) => String(service.name)),
    servicePricing: Object.fromEntries(services.map((service) => [service.name, service.price])),
    services,
    startingPrice: services.length ? Math.min(...services.map((service) => Number(service.price))) : listing.startingPrice,
  } as CatalogProvider;
}

function derivedListings({ users, categories, providers, servicesFor }: DerivationInput): CatalogProvider[] {
  const accounts = users.filter((account) => account?.role === 'provider');
  const ids = new Map<string, number>();
  accounts.forEach((account) => ids.set(String(account.id), (ids.get(String(account.id)) || 0) + 1));
  const taken = new Set(providers.map((listing) => listing.id));
  const covered = new Set(providers.filter((listing) => listing.ownerProviderId).map((listing) => [lower(canonicalProviderId(String(listing.ownerProviderId))), listing.category, Number(listing.cityId)].join('|')));
  const result: CatalogProvider[] = [];

  accounts.forEach((account) => {
    // Only verified, active accounts, and only ids that name exactly one account (shared legacy ids keep their synced listings).
    if (providerAccountStatus(account) !== 'Active' || ids.get(String(account.id)) !== 1) return;
    const groups = new Map<string, { category: string; cityId: number; cityName: string; services: Account[] }>();
    servicesFor(String(account.id)).forEach((service) => {
      const price = Number(service?.price);
      if (!service?.name || String(service.status || 'Active') === 'Inactive' || service.isActive === false || !Number.isFinite(price) || price <= 0) return;
      const category = categoryId(service.category || account.serviceType, categories);
      const cityId = Number(service.cityId || account.cityId);
      const cityName = String(service.cityName || service.location || account.cityName || account.location || '').trim();
      if (!category || !Number.isInteger(cityId) || cityId <= 0 || !cityName) return;
      const key = `${category}|${cityId}`;
      if (!groups.has(key)) groups.set(key, { category, cityId, cityName, services: [] });
      groups.get(key)!.services.push({ id: service.id, name: service.name, category: service.category || category, description: service.description, duration: service.duration, price, status: 'Active' });
    });
    const base = slug(account.providerCatalogId) || slug(account.organisationName || account.fullName) || lower(account.id);
    groups.forEach((group) => {
      if (covered.has([lower(canonicalProviderId(String(account.id))), group.category, group.cityId].join('|'))) return;
      let id = `${base}-${group.category}-${group.cityId}`;
      if (taken.has(id)) id = `${base}-${lower(account.id)}-${group.category}-${group.cityId}`;
      if (taken.has(id)) return;
      taken.add(id);
      const prices = group.services.map((service) => service.price);
      result.push({
        id,
        name: String(account.organisationName || account.fullName),
        category: group.category,
        subServices: group.services.map((service) => String(service.name)),
        years: Number(account.experience) || 0,
        rating: 0,
        reviews: 0,
        distance: '',
        startingPrice: Math.min(...prices),
        location: group.cityName,
        jobsDone: 0,
        // Real availability comes from the provider's schedule; nothing is claimed here.
        availableToday: false,
        verified: true,
        cityId: group.cityId,
        image: CATEGORY_IMAGES[group.category] || CATEGORY_IMAGES['home-cleaning'],
        ownerProviderId: String(account.id),
        ownerProviderEmail: lower(account.email),
        accountStatus: 'Active',
        approvalStatus: String(account.approvalStatus || 'Active'),
        verificationStatus: account.verificationStatus || 'Verified',
        servicePricing: Object.fromEntries(group.services.map((service) => [service.name, service.price])),
        services: group.services,
      } as CatalogProvider);
    });
  });
  return result;
}

export function catalogView(input: DerivationInput): CatalogProvider[] {
  const accounts = input.users.filter((account) => account?.role === 'provider');
  const shared = (account: Account) => accounts.filter((candidate) => String(candidate.id) === String(account.id)).length > 1;
  const synced = input.providers.map((listing) => {
    // Seed providers carry no owner id on their listing; their account names the listing as its providerCatalogId.
    const account = listingOwner(listing, accounts);
    if (!account) return listing;
    // Records are authoritative except for a legacy id shared by two accounts, whose id-keyed records
    // cannot be told apart (the same rule accountServices() applies).
    const records = shared(account) ? [] : input.servicesFor(String(account.id));
    return withRecordedServices(overlay(listing, account), account, records, input.categories);
  });
  // An active provider's own submitted profile photo is shown on their listing unless the listing already
  // carries one; it is served by the public photo route, never from the private document store directly.
  return synced.concat(derivedListings({ ...input, providers: synced })).map((listing) => {
    // A photo the provider has stored with us always wins over an older reference on the listing, so a
    // replaced photo shows everywhere; the rating shown is the one computed from real customer reviews.
    const account = listingOwner(listing, accounts);
    const withPhoto = account && input.hasPhoto && providerAccountStatus(account) === 'Active' && input.hasPhoto(account) ? { ...listing, profilePhoto: profilePhotoPath(listing.id) } : listing;
    if (!input.ratingFor) return withPhoto;
    const { average, total } = input.ratingFor(withPhoto);
    return { ...withPhoto, rating: total ? Math.round(average * 10) / 10 : 0, reviews: total };
  });
}
