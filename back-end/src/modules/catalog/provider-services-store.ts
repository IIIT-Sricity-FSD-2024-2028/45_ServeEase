import { canonicalProviderId } from '../../common/provider-identity';
import { StateRepository } from '../state/state.repository';

// The one place a provider's saved service records live: state entry `serveEaseProviderServices:<id>` with
// { providerId, services[], updatedAt }. The catalog repository, registration and Provider Operations all go
// through this, so a service is saved and read the same way everywhere.
export const providerServicesKey = (providerId: string): string => `serveEaseProviderServices:${canonicalProviderId(providerId)}`;

export function dedupeServices(services: any[]): any[] {
  const byKey = new Map<string, any>();
  services.forEach((service) => {
    if (!service || (!service.id && !service.name)) return;
    const key = service.id ? `id:${String(service.id)}` : `name:${String(service.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    byKey.set(key, service);
  });
  return Array.from(byKey.values());
}

export function readProviderServices(state: StateRepository, providerId: string): any[] {
  const entry = state.findById(providerServicesKey(providerId));
  return entry && Array.isArray(entry.value.services) ? dedupeServices(entry.value.services as any[]) : [];
}

export function writeProviderServices(state: StateRepository, providerId: string, services: any[]): any[] {
  const clean = dedupeServices(services);
  const value = { providerId, services: clean, updatedAt: new Date().toISOString() };
  const key = providerServicesKey(providerId);
  if (state.findById(key)) state.update(key, { value });
  else state.create({ key, value });
  return clean;
}
