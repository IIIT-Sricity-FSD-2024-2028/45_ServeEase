import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { CatalogProvider, CatalogState } from './catalog.entity';
import { CatalogService } from './catalog.service';
import { SyncCatalogDto } from './dto/sync-catalog.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@ApiTags('catalog')
@ApiExtraModels(ApiSuccessResponse, CatalogState, CatalogProvider)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@UseGuards(RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get ServeEase service catalog' })
  @ApiOkResponse({ description: 'Catalog returned successfully.', schema: successResponseSchema(CatalogState) })
  findAll() {
    return successResponse(this.catalogService.findAll());
  }

  @Get('providers/:id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get one provider from the catalog' })
  @ApiOkResponse({ description: 'Provider returned successfully.', schema: successResponseSchema(CatalogProvider) })
  findById(@Param('id') id: string) {
    return successResponse(this.catalogService.findById(id));
  }

  @Post('sync')
  @Roles('admin')
  @ApiOperation({ summary: 'Sync frontend catalog into backend memory' })
  @ApiBody({ type: SyncCatalogDto })
  @ApiOkResponse({ description: 'Catalog synced successfully.', schema: successResponseSchema(CatalogState) })
  create(@Body() data: SyncCatalogDto) {
    return successResponse(this.catalogService.create(data));
  }

  @Patch('providers/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a provider in the catalog' })
  @ApiBody({ type: UpdateProviderDto })
  @ApiOkResponse({ description: 'Provider updated successfully.', schema: successResponseSchema(CatalogProvider) })
  update(@Param('id') id: string, @Body() data: UpdateProviderDto) {
    return successResponse(this.catalogService.update(id, data));
  }

  @Delete('providers/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a provider from the catalog' })
  @ApiOkResponse({ description: 'Provider deleted successfully.', schema: successResponseSchema(CatalogProvider) })
  delete(@Param('id') id: string) {
    return successResponse(this.catalogService.delete(id));
  }
}
