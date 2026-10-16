import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { ProviderDocumentsModule } from '../provider-documents/provider-documents.module';
import { StateModule } from '../state/state.module';

@Module({
  imports: [StateModule, ProviderDocumentsModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
