type Account = Record<string, any>;
type Record_ = Record<string, any>;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// The profile-photo document a provider submitted: the newest stored image record of that account's own
// "profile photo" document. Identity is account id + owner email, so a shared id never mixes two accounts.
export function profilePhotoRecord(documents: Record_[], account: Account): Record_ | undefined {
  const id = String(account?.id ?? '');
  const email = String(account?.email ?? '').trim().toLowerCase();
  const matches = documents.filter((record) => record
    && String(record.providerAccountId) === id
    && String(record.ownerEmail ?? '') === email
    && String(record.documentType ?? '').replace(/[^a-z]/gi, '').toLowerCase() === 'profilephoto'
    && IMAGE_TYPES.includes(String(record.mimeType)));
  return matches[matches.length - 1];
}

// Where customers load an approved provider's photo from (public, image-only; see CatalogController).
export const profilePhotoPath = (listingId: string) => `/catalog/providers/${encodeURIComponent(listingId)}/photo`;
