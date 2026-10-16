import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CatalogCategoryDto, CatalogProviderDto, PopularServiceDto, SyncCatalogDto } from './dto/sync-catalog.dto';

// Persisted state entry written by the frontend state bridge; holds categories, providers,
// popularServices (plus users and approval requests, which are never copied into the catalog).
export const CATALOG_STATE_KEY = 'serveEaseData';

export interface CatalogSnapshotResult {
  catalog: SyncCatalogDto | null;
  skipped: string[];
  error?: string;
}

export const CATEGORY_IMAGES: Record<string, string> = {
  'home-cleaning': 'assets/images/home-cleaning/clean1.jpg',
  carpentry: 'assets/images/carpentry/carpentry1.jpg.jpeg',
  painting: 'assets/images/painting/painting1.jpg.jpeg',
  'salon-at-home': 'assets/images/salon-at-home/salon1.jpg',
  plumbing: 'assets/images/plumbing/plumbing1.jpg.jpeg',
  electrician: 'assets/images/electrician/ele1.jpg.jpeg',
  'appliance-repair-installation': 'assets/images/appliance-repair/ACrepair.jpg.jpeg',
  'pest-control': 'assets/images/pest-control/pest1.jpg.jpeg',
};

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Same rule as canonicalProfilePhotoReference() in front-end/JavaScript/api.js.
function profilePhotoReference(value: unknown): string | undefined {
  const reference = String(value || '').trim();
  if (!reference || reference.length > 4 * 1024 * 1024) return undefined;
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(reference)) return reference;
  if (/^https?:\/\/[^/]+\/uploads\/profiles\/[^?#\s]+$/i.test(reference)) return reference;
  return undefined;
}

// Field mapping of ServeEaseApi.syncCatalog() in front-end/JavaScript/api.js, so startup produces
// the same catalog a superuser sync would.
function toProviderPayload(provider: Record<string, any>): Record<string, unknown> {
  const image = String(provider.image || '');
  const payload: Record<string, unknown> = {
    id: provider.id,
    name: provider.name,
    category: provider.category,
    subServices: provider.subServices,
    years: provider.years,
    rating: provider.rating,
    reviews: provider.reviews,
    distance: provider.distance,
    startingPrice: provider.startingPrice,
    location: provider.location,
    jobsDone: provider.jobsDone,
    availableToday: provider.availableToday,
    verified: provider.verified,
    cityId: provider.cityId,
    image: image && !/^data:/i.test(image) && image.length <= 300 && !/^\/uploads\/profiles\//i.test(image)
      ? image
      : (CATEGORY_IMAGES[provider.category] || CATEGORY_IMAGES['home-cleaning']),
    availabilitySlots: provider.availabilitySlots,
    ownerProviderId: provider.ownerProviderId,
    ownerProviderEmail: provider.ownerProviderEmail,
    accountStatus: provider.accountStatus,
    approvalStatus: provider.approvalStatus,
    verificationStatus: provider.verificationStatus,
    profilePhoto: profilePhotoReference(provider.profilePhoto),
    servicePricing: provider.servicePricing,
    services: provider.services,
  };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function validItems<T extends object>(dto: new () => T, items: unknown[], label: string, skipped: string[]): T[] {
  return items.flatMap((item, index) => {
    if (!isRecord(item)) {
      skipped.push(`${label}[${index}]: not an object`);
      return [];
    }
    const instance = plainToInstance(dto, item);
    const errors = validateSync(instance, { whitelist: true });
    if (errors.length) {
      skipped.push(`${label} ${String(item.id || item.title || index)}: invalid ${errors.map((error) => error.property).join(', ')}`);
      return [];
    }
    return [instance];
  });
}

// Builds a validated SyncCatalogDto from the persisted serveEaseData value. Invalid records are
// skipped and listed; a missing or unusable snapshot returns catalog: null with the reason.
export function catalogSnapshotFromState(value: unknown): CatalogSnapshotResult {
  if (!isRecord(value)) return { catalog: null, skipped: [], error: `"${CATALOG_STATE_KEY}" is not an object.` };
  if (!Array.isArray(value.categories) || !Array.isArray(value.providers)) {
    return { catalog: null, skipped: [], error: `"${CATALOG_STATE_KEY}" has no categories/providers arrays.` };
  }
  const skipped: string[] = [];
  const categories = validItems(CatalogCategoryDto, value.categories, 'category', skipped);
  const providers = validItems(CatalogProviderDto, value.providers.map((provider) => (isRecord(provider) ? toProviderPayload(provider) : provider)), 'provider', skipped);
  const popularServices = validItems(PopularServiceDto, Array.isArray(value.popularServices) ? value.popularServices : [], 'popular service', skipped);
  if (!categories.length || !providers.length) {
    return { catalog: null, skipped, error: `"${CATALOG_STATE_KEY}" has no valid ${categories.length ? 'providers' : 'categories'}.` };
  }
  return { catalog: { categories, providers, popularServices }, skipped };
}
