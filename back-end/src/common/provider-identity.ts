export function canonicalProviderId(providerId: string): string {
  const value = String(providerId || '').trim();
  return /^PRO-CAT-00[45]$/i.test(value) || /cleanpro/i.test(value) ? 'PRO001' : value;
}
