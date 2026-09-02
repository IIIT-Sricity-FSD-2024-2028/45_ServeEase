import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogProvider, CatalogState } from './catalog.entity';
import { CatalogRepository } from './catalog.repository';
import { SyncCatalogDto } from './dto/sync-catalog.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderServiceDto, UpdateProviderServiceDto } from './dto/provider-service.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  findAll(): CatalogState {
    return this.catalogRepository.findAll();
  }

  findById(id: string): CatalogProvider {
    if (!id.trim()) {
      throw new BadRequestException('Provider id is required.');
    }
    const provider = this.catalogRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Provider with id "${id}" was not found.`);
    }
    return provider;
  }

  create(data: SyncCatalogDto): CatalogState {
    if (!data.categories.length || !data.providers.length) {
      throw new BadRequestException('Catalog sync requires categories and providers.');
    }
    return this.catalogRepository.create(data);
  }

  update(id: string, data: UpdateProviderDto): CatalogProvider {
    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field must be provided for update.');
    }
    const provider = this.catalogRepository.update(id, data);
    if (!provider) {
      throw new NotFoundException(`Provider with id "${id}" was not found.`);
    }
    return provider;
  }

  delete(id: string): CatalogProvider {
    const provider = this.catalogRepository.delete(id);
    if (!provider) {
      throw new NotFoundException(`Provider with id "${id}" was not found.`);
    }
    return provider;
  }

  findServices(providerId: string): any[] {
    this.validateProviderId(providerId);
    return this.catalogRepository.findServices(providerId);
  }

  createService(providerId: string, data: ProviderServiceDto): any {
    this.validateProviderId(providerId);
    return this.catalogRepository.createService(providerId, data);
  }

  updateService(providerId: string, serviceId: string, data: UpdateProviderServiceDto): any {
    this.validateProviderId(providerId);
    if (!serviceId.trim()) throw new BadRequestException('Service id is required.');
    const service = this.catalogRepository.updateService(providerId, serviceId, data);
    if (!service) throw new NotFoundException(`Service with id "${serviceId}" was not found.`);
    return service;
  }

  private validateProviderId(providerId: string): void {
    if (!providerId || !providerId.trim()) throw new BadRequestException('Provider id is required.');
  }
}
