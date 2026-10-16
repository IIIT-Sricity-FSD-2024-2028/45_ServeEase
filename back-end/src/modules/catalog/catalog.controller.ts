import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import { providerAccountStatus } from '../../common/provider-account-status';
import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import { profilePhotoPath } from '../provider-documents/profile-photo';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { CatalogProvider, CatalogState } from './catalog.entity';
import { CatalogService } from './catalog.service';
import { SyncCatalogDto } from './dto/sync-catalog.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderServiceDto, UpdateProviderServiceDto } from './dto/provider-service.dto';

@ApiTags('catalog')
@ApiExtraModels(ApiSuccessResponse, CatalogState, CatalogProvider)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" for full access or "user" for read-only GET access.',
})
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService, private readonly documents: ProviderDocumentsService) {}

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

  // Public on purpose: customers' browsers load listing images without a session. It serves only the profile-photo
  // image an Active provider submitted for a listing that points at this route; nothing else from the document
  // store is reachable, and any other state answers 404.
  @Get('providers/:id/photo')
  @ApiOperation({ summary: "Get an approved provider's submitted profile photo (public image)" })
  photo(@Param('id') id: string, @Res() response: Response) {
    const listing = this.catalogService.findAll().providers.find((candidate) => candidate.id === id);
    const account = listing && listing.profilePhoto === profilePhotoPath(listing.id) ? this.catalogService.ownerOf(listing) : undefined;
    const file = account && providerAccountStatus(account) === 'Active' ? this.documents.publicProfilePhoto(account) : undefined;
    if (!file) throw new NotFoundException('This provider has no profile photo.');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Cache-Control', 'private, max-age=30');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    createReadStream(file.path).on('error', () => response.destroy()).pipe(response);
  }

  @Post('sync')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Sync frontend catalog into backend memory' })
  @ApiBody({ type: SyncCatalogDto })
  @ApiOkResponse({ description: 'Catalog synced successfully.', schema: successResponseSchema(CatalogState) })
  create(@Body() data: SyncCatalogDto) {
    return successResponse(this.catalogService.create(data));
  }

  @Patch('providers/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update a provider in the catalog' })
  @ApiBody({ type: UpdateProviderDto })
  @ApiOkResponse({ description: 'Provider updated successfully.', schema: successResponseSchema(CatalogProvider) })
  update(@Param('id') id: string, @Body() data: UpdateProviderDto) {
    return successResponse(this.catalogService.update(id, data));
  }

  @Delete('providers/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a provider from the catalog' })
  @ApiOkResponse({ description: 'Provider deleted successfully.', schema: successResponseSchema(CatalogProvider) })
  delete(@Param('id') id: string) {
    return successResponse(this.catalogService.delete(id));
  }

  @Get('providers/:providerId/services')
  @Roles('admin', 'provider', 'user')
  @ApiOperation({ summary: 'Get persistent services for a provider' })
  findServices(@Param('providerId') providerId: string) {
    return successResponse(this.catalogService.findServices(providerId));
  }

  @Post('providers/:providerId/services')
  @UseGuards(RolesGuard)
  @Roles('admin', 'provider')
  @ApiOperation({ summary: 'Create a provider service' })
  @ApiBody({ type: ProviderServiceDto })
  createService(@Param('providerId') providerId: string, @Body() data: ProviderServiceDto, @Req() request: Request) {
    this.assertProviderOwnership(request, providerId);
    return successResponse(this.catalogService.createService(providerId, data));
  }

  @Patch('providers/:providerId/services/:serviceId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'provider')
  @ApiOperation({ summary: 'Update a provider service' })
  @ApiBody({ type: UpdateProviderServiceDto })
  updateService(@Param('providerId') providerId: string, @Param('serviceId') serviceId: string, @Body() data: UpdateProviderServiceDto, @Req() request: Request) {
    this.assertProviderOwnership(request, providerId);
    return successResponse(this.catalogService.updateService(providerId, serviceId, data));
  }

  private assertProviderOwnership(request: Request, providerId: string) {
    if (request.auth?.role !== 'provider') return;
    const ownedIds = [request.auth.userId, request.auth.providerCatalogId].filter(Boolean).map((value) => String(value).toLowerCase());
    if (!ownedIds.includes(String(providerId).toLowerCase())) throw new ForbiddenException('You can manage only your own provider resources.');
  }
}
