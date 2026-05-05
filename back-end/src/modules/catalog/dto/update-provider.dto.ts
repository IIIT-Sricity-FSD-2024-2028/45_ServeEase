import { PartialType } from '@nestjs/swagger';
import { CatalogProviderDto } from './sync-catalog.dto';

export class UpdateProviderDto extends PartialType(CatalogProviderDto) {}
