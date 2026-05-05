import { Injectable } from '@nestjs/common';
import { CatalogProvider, CatalogState } from './catalog.entity';
import { SyncCatalogDto } from './dto/sync-catalog.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class CatalogRepository {
  private catalog: CatalogState = {
    categories: [],
    providers: [],
    popularServices: [],
  };

  findAll(): CatalogState {
    return this.catalog;
  }

  findById(id: string): CatalogProvider | undefined {
    return this.catalog.providers.find((provider) => provider.id === id);
  }

  create(data: SyncCatalogDto): CatalogState {
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
