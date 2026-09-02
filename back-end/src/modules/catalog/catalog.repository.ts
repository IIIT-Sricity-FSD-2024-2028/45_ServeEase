import { Injectable } from '@nestjs/common';
import { CatalogProvider, CatalogState } from './catalog.entity';
import { SyncCatalogDto } from './dto/sync-catalog.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderServiceDto, UpdateProviderServiceDto } from './dto/provider-service.dto';
import { StateRepository } from '../state/state.repository';
import { canonicalProviderId } from '../../common/provider-identity';

@Injectable()
export class CatalogRepository {
  private catalog: CatalogState = {
    categories: [],
    providers: [],
    popularServices: [],
  };

  constructor(private readonly stateRepository: StateRepository) {}

  private servicesKey(providerId: string): string {
    return `serveEaseProviderServices:${canonicalProviderId(providerId)}`;
  }

  findServices(providerId: string): any[] {
    const entry = this.stateRepository.findById(this.servicesKey(providerId));
    return entry && Array.isArray(entry.value.services) ? entry.value.services as any[] : [];
  }

  saveServices(providerId: string, services: any[]): any[] {
    const value = { providerId, services, updatedAt: new Date().toISOString() };
    const key = this.servicesKey(providerId);
    const existing = this.stateRepository.findById(key);
    if (existing) this.stateRepository.update(key, { value });
    else this.stateRepository.create({ key, value });
    return services;
  }

  createService(providerId: string, data: ProviderServiceDto): any {
    const services = this.findServices(providerId);
    const service = {
      ...data,
      id: data.id || `SVC-${Date.now()}`,
      status: data.status || (data.isActive === false ? 'Inactive' : 'Active'),
      isActive: data.isActive !== false && data.status !== 'Inactive',
      updatedAt: new Date().toISOString(),
    };
    services.push(service);
    this.saveServices(providerId, services);
    return service;
  }

  updateService(providerId: string, serviceId: string, data: UpdateProviderServiceDto): any | undefined {
    const services = this.findServices(providerId);
    const service = services.find((item) => item && item.id === serviceId);
    if (!service) return undefined;
    Object.assign(service, data);
    if (data.isActive !== undefined) service.status = data.isActive ? 'Active' : 'Inactive';
    if (data.status !== undefined) service.isActive = data.status !== 'Inactive';
    service.updatedAt = new Date().toISOString();
    this.saveServices(providerId, services);
    return service;
  }

  syncServices(providerId: string, services: any[]): any[] {
    return this.saveServices(providerId, services.map((service) => ({
      ...service,
      isActive: service.status !== 'Inactive' && service.isActive !== false,
      status: service.status === 'Inactive' || service.isActive === false ? 'Inactive' : 'Active',
    })));
  }

  findAll(): CatalogState {
    return this.catalog;
  }

  findById(id: string): CatalogProvider | undefined {
    return this.catalog.providers.find((provider) => provider.id === id);
  }

  create(data: SyncCatalogDto): CatalogState {
    data.providers.forEach((provider) => {
      if (provider.ownerProviderId && Array.isArray(provider.services)) {
        provider.ownerProviderId = canonicalProviderId(provider.ownerProviderId);
        const existing = this.findServices(provider.ownerProviderId);
        const activeIds = new Set(provider.services.map((service: any) => service && service.id));
        const inactive = existing.filter((service: any) => service && !activeIds.has(service.id));
        this.syncServices(provider.ownerProviderId, provider.services.concat(inactive));
      }
    });
    this.catalog = {
      categories: data.categories,
      providers: this.normalizeProviders(data.providers),
      popularServices: data.popularServices ?? [],
    };
    return this.catalog;
  }

  update(id: string, data: UpdateProviderDto): CatalogProvider | undefined {
    const provider = this.findById(id);
    if (!provider) return undefined;
    Object.assign(provider, data);
    return provider;
  }

  delete(id: string): CatalogProvider | undefined {
    const index = this.catalog.providers.findIndex((provider) => provider.id === id);
    if (index === -1) return undefined;
    const [deletedProvider] = this.catalog.providers.splice(index, 1);
    return deletedProvider;
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private isRemovedProvider(provider: CatalogProvider): boolean {
    return [
      provider.id,
      provider.name,
      provider.ownerProviderEmail,
      provider.ownerProviderId,
    ].some((value) => this.normalizeText(value).includes('koushikpestcontrol'));
  }

  private getProviderBaseId(provider: CatalogProvider): string {
    return String(provider.id || '').replace(new RegExp(`-${provider.category}-${provider.cityId}$`), '');
  }

  private getProviderKey(provider: CatalogProvider): string {
    return [
      this.normalizeText(provider.ownerProviderId || this.getProviderBaseId(provider)),
      provider.category,
      Number(provider.cityId) || 0,
    ].join('|');
  }

  private getProviderScore(provider: CatalogProvider): number {
    const serviceCount = Array.isArray(provider.subServices) ? provider.subServices.length : 0;
    return (provider.ownerProviderId ? 1000 : 0) + serviceCount * 10;
  }

  private normalizeProviders(providers: CatalogProvider[]): CatalogProvider[] {
    const bestByKey = new Map<string, CatalogProvider>();

    providers.forEach((provider) => {
      if (!provider || this.isRemovedProvider(provider)) return;

      const normalizedProvider: CatalogProvider = {
        ...provider,
        name: this.normalizeText([provider.id, provider.name, provider.ownerProviderEmail].join(' ')).includes('cleanpro')
          ? 'Cleanpro Services'
          : provider.name,
      };
      const key = this.getProviderKey(normalizedProvider);
      const existing = bestByKey.get(key);

      if (!existing || this.getProviderScore(normalizedProvider) >= this.getProviderScore(existing)) {
        bestByKey.set(key, normalizedProvider);
      }
    });

    return Array.from(bestByKey.values());
  }
}
