// Customer account status follows the existing record convention (front-end data-completion.js
// updateCustomerAccountStatus): `accountStatus`, mirrored in `status`, is 'Active' or 'Blocked'. A record
// with neither field set is Active. Status is separate from the account's role and credentials.
export const CUSTOMER_ACCOUNT_STATUSES = ['Active', 'Blocked'] as const;
export type CustomerAccountStatus = (typeof CUSTOMER_ACCOUNT_STATUSES)[number];

// Returns the canonical status, or the raw recorded value when it is not one this module manages.
export function customerAccountStatus(account: Record<string, any> | undefined): string {
  const raw = String(account?.accountStatus || account?.status || '').trim();
  if (raw === '') return 'Active';
  return CUSTOMER_ACCOUNT_STATUSES.find((status) => status.toLowerCase() === raw.toLowerCase()) || raw;
}

export function isSuspendedCustomer(account: Record<string, any> | undefined): boolean {
  return account?.role === 'customer' && customerAccountStatus(account) === 'Blocked';
}

export const SUSPENDED_CUSTOMER_MESSAGE = 'Your ServeEase customer account is currently suspended. Please contact ServeEase Support for more information.';

export const CUSTOMER_SUSPENDED_CODE = 'CUSTOMER_ACCOUNT_SUSPENDED';

// The reason Customer Operations recorded for the current suspension, read from the customer record itself
// (the latest "Blocked" history entry, as the original getCustomerSuspensionReason(), else blockReason).
export function customerSuspensionReason(account: Record<string, any> | undefined): string {
  const history = Array.isArray(account?.statusHistory) ? account.statusHistory : [];
  const latest = history.find((entry: Record<string, any>) => String(entry?.newStatus || entry?.status || '').toLowerCase() === 'blocked' && String(entry?.reason || '').trim());
  return String(latest?.reason || account?.blockReason || account?.suspensionReason || '').trim();
}
