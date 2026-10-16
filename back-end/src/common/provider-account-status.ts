// Provider account and verification status as the original Provider Operations page derives them
// (front-end/JavaScript/provider-operations.js accountStatus() / canonicalVerificationStatus()). Provider
// records carry several overlapping fields (accountStatus, status, approvalStatus, verificationStatus);
// the first recorded one decides the operational status.
const UNRECORDED = ['', 'not recorded', 'n/a', 'na'];
const clean = (value: unknown) => String(value ?? '').trim();

export type ProviderAccountStatus = 'Active' | 'Suspended' | 'Verification Rejected' | 'Under Verification' | string;

export function providerAccountStatus(account: Record<string, any> | undefined): ProviderAccountStatus {
  const raw = [account?.accountStatus, account?.status, account?.approvalStatus, account?.verificationStatus]
    .map(clean)
    .find((value) => !UNRECORDED.includes(value.toLowerCase())) || '';
  const key = raw.toLowerCase();
  if (['active', 'approved', 'verified'].includes(key)) return 'Active';
  if (key === 'suspended') return 'Suspended';
  if (key === 'rejected' || key === 'verification rejected') return 'Verification Rejected';
  if (['pending approval', 'pending', 'under verification'].includes(key)) return 'Under Verification';
  if (!raw && account?.verified === true) return 'Active';
  if (!raw && account?.verified === false) return 'Under Verification';
  return raw || 'Active';
}

export function providerVerificationStatus(accountStatus: ProviderAccountStatus): 'Verified' | 'Rejected' | 'Pending' | null {
  if (accountStatus === 'Active' || accountStatus === 'Suspended') return 'Verified';
  if (accountStatus === 'Verification Rejected') return 'Rejected';
  if (accountStatus === 'Under Verification') return 'Pending';
  return null;
}

// The status fields each decision writes, exactly as the original approveProvider()/rejectProvider().
export const VERIFICATION_DECISIONS = {
  approve: { approvalStatus: 'Active', verificationStatus: 'Verified', accountStatus: 'Active', verified: true, action: 'Verification approved' },
  reject: { approvalStatus: 'Rejected', verificationStatus: 'Rejected', accountStatus: 'Verification Rejected', verified: false, action: 'Verification rejected' },
} as const;
export type VerificationDecision = keyof typeof VERIFICATION_DECISIONS;

// Suspend/activate applies only to verified providers (original suspendProvider()/activateProvider()).
export const PROVIDER_ACCOUNT_STATUSES = ['Active', 'Suspended'] as const;
export type ManagedProviderStatus = (typeof PROVIDER_ACCOUNT_STATUSES)[number];

export function isSuspendedProvider(account: Record<string, any> | undefined): boolean {
  return account?.role === 'provider' && providerAccountStatus(account) === 'Suspended';
}

export const SUSPENDED_PROVIDER_MESSAGE = 'Your ServeEase provider account is currently suspended. Please contact ServeEase Support for more information.';

export const PROVIDER_SUSPENDED_CODE = 'PROVIDER_ACCOUNT_SUSPENDED';

// The reason Provider Operations recorded for the current suspension, read from the provider record itself.
export function providerSuspensionReason(account: Record<string, any> | undefined): string {
  return String(account?.suspensionReason || '').trim();
}
