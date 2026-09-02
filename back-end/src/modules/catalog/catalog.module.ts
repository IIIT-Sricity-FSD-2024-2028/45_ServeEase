import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { StateModule } from '../state/state.module';

@Module({
  imports: [StateModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
