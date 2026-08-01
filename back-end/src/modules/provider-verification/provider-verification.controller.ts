import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, successResponse, successResponseSchema } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateProviderVerificationDto, ProviderActionDto, RejectDocumentDto, RejectProviderDto } from './dto/provider-action.dto';
import { ProviderVerification, VerificationDocument } from './provider-verification.entity';
import { ProviderVerificationService } from './provider-verification.service';

@ApiTags('admin-provider-verification')
@ApiExtraModels(ApiSuccessResponse, ProviderVerification, VerificationDocument)
@ApiHeader({
  name: 'role',
  required: true,
  description: 'Use "admin" or "superuser" to access provider verification.',
})
@UseGuards(RolesGuard)
@Controller('admin/providers')
export class ProviderVerificationController {
  constructor(private readonly providerService: ProviderVerificationService) {}

  @Get('verification')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Get provider verification requests' })
  @ApiOkResponse({ description: 'Provider verification requests returned successfully.', schema: successResponseSchema(ProviderVerification, true) })
  findAll() {
    return successResponse(this.providerService.findAll());
  }

  @Post('verification')
  @Roles('admin', 'superuser', 'user')
  @ApiOperation({ summary: 'Create provider verification request from provider registration' })
  @ApiBody({ type: CreateProviderVerificationDto })
  @ApiOkResponse({ description: 'Provider verification request created successfully.', schema: successResponseSchema(ProviderVerification) })
  create(@Body() data: CreateProviderVerificationDto) {
    return successResponse(this.providerService.create(data));
  }

  @Get(':id')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Get provider verification details' })
  @ApiOkResponse({ description: 'Provider returned successfully.', schema: successResponseSchema(ProviderVerification) })
  findById(@Param('id') id: string) {
    return successResponse(this.providerService.findById(id));
  }

  @Get(':id/documents')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Get provider verification documents' })
  @ApiOkResponse({ description: 'Provider documents returned successfully.', schema: successResponseSchema(VerificationDocument, true) })
  getDocuments(@Param('id') id: string) {
    return successResponse(this.providerService.getDocuments(id));
  }

  @Patch(':id/approve')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Approve provider after required documents are approved' })
  @ApiBody({ type: ProviderActionDto })
  @ApiOkResponse({ description: 'Provider approved successfully.', schema: successResponseSchema(ProviderVerification) })
  approveProvider(@Param('id') id: string, @Body() data: ProviderActionDto) {
    return successResponse(this.providerService.approveProvider(id, data));
  }

  @Patch(':id/reject')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Reject provider verification request' })
  @ApiBody({ type: RejectProviderDto })
  @ApiOkResponse({ description: 'Provider rejected successfully.', schema: successResponseSchema(ProviderVerification) })
  rejectProvider(@Param('id') id: string, @Body() data: RejectProviderDto) {
    return successResponse(this.providerService.rejectProvider(id, data));
  }

  @Patch(':id/suspend')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Suspend verified or active provider' })
  @ApiBody({ type: ProviderActionDto })
  @ApiOkResponse({ description: 'Provider suspended successfully.', schema: successResponseSchema(ProviderVerification) })
  suspendProvider(@Param('id') id: string, @Body() data: ProviderActionDto) {
    return successResponse(this.providerService.suspendProvider(id, data));
  }

  @Patch(':id/documents/:documentId/approve')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Approve one provider document' })
  @ApiOkResponse({ description: 'Document approved successfully.', schema: successResponseSchema(VerificationDocument) })
  approveDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    return successResponse(this.providerService.approveDocument(id, documentId));
  }

  @Patch(':id/documents/:documentId/reject')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Reject one provider document' })
  @ApiBody({ type: RejectDocumentDto })
  @ApiOkResponse({ description: 'Document rejected successfully.', schema: successResponseSchema(VerificationDocument) })
  rejectDocument(@Param('id') id: string, @Param('documentId') documentId: string, @Body() data: RejectDocumentDto) {
    return successResponse(this.providerService.rejectDocument(id, documentId, data));
  }
}
