import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { documentIdParam, documentUploadOptions, sendDocument } from '../provider-documents/document-response';
import { originOf } from '../provider-documents/provider-documents.controller';
import { successResponse } from '../../common/api-response';
import { Departments, Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { ProviderVerificationDecisionDto, UpdateCustomerStatusDto, UpdateProviderStatusDto } from './employee-operations.dto';
import { EmployeeOperationsService } from './employee-operations.service';
import { ProviderOperationsService } from './provider-operations.service';

const customerId = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new BadRequestException('Invalid customer id.');
  return id;
};
const providerId = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new BadRequestException('Invalid provider id.');
  return id;
};
// Optional catalog listing id that disambiguates the few legacy provider accounts sharing one id.
const listingId = (listing?: string) => {
  if (listing === undefined || listing === '') return undefined;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(listing)) throw new BadRequestException('Invalid provider listing id.');
  return listing;
};

// Department workspaces for employees. The 'support' role is the employee session role; @Departments
// narrows each route to one department (checked by RolesGuard against the server-side employee record).
// Superusers (authorised as 'admin') have the same access as the department.
@ApiTags('employee-operations')
@UseGuards(RolesGuard)
@Controller('employee')
export class EmployeeOperationsController {
  constructor(private readonly operations: EmployeeOperationsService, private readonly providerOperations: ProviderOperationsService) {}

  @Get('customer-operations/customers')
  @Roles('support', 'admin')
  @Departments('Customer Operations')
  @ApiOperation({ summary: 'List customer accounts with booking and ticket totals (Customer Operations, read-only)' })
  customers() {
    return successResponse(this.operations.customerOverview());
  }

  @Get('customer-operations/customers/:id')
  @Roles('support', 'admin')
  @Departments('Customer Operations')
  @ApiOperation({ summary: 'Read one customer with their bookings and support tickets (Customer Operations, read-only)' })
  customer(@Param('id') id: string) {
    return successResponse(this.operations.customerDetail(customerId(id)));
  }

  @Patch('customer-operations/customers/:id/status')
  @Roles('support', 'admin')
  @Departments('Customer Operations')
  @ApiOperation({ summary: "Suspend ('Blocked') or reactivate ('Active') a customer account (Customer Operations or superuser)" })
  @ApiBody({ type: UpdateCustomerStatusDto })
  updateCustomerStatus(@Param('id') id: string, @Body() body: UpdateCustomerStatusDto, @Req() request: Request) {
    // The actor comes from the session principal set by RolesGuard, never from request headers.
    return successResponse(this.operations.setCustomerStatus(customerId(id), body, request.auth!));
  }

  @Get('provider-operations/providers')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: 'List provider accounts with account/verification status and document and service counts (Provider Operations)' })
  providers() {
    return successResponse(this.providerOperations.overview());
  }

  @Get('provider-operations/providers/:id')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: 'Read one provider with documents (metadata only), services, bookings, availability, tickets and status history (Provider Operations)' })
  provider(@Param('id') id: string, @Query('listing') listing?: string) {
    return successResponse(this.providerOperations.detail(providerId(id), listingId(listing)));
  }

  @Patch('provider-operations/providers/:id/verification')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: 'Approve or reject a pending provider verification (Provider Operations or superuser)' })
  @ApiBody({ type: ProviderVerificationDecisionDto })
  decideProviderVerification(@Param('id') id: string, @Body() body: ProviderVerificationDecisionDto, @Req() request: Request, @Query('listing') listing?: string) {
    // The actor comes from the session principal set by RolesGuard, never from request headers.
    return successResponse(this.providerOperations.decideVerification(providerId(id), listingId(listing), body, request.auth!));
  }

  @Patch('provider-operations/providers/:id/status')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: "Suspend ('Suspended') or reactivate ('Active') a verified provider (Provider Operations or superuser)" })
  @ApiBody({ type: UpdateProviderStatusDto })
  updateProviderStatus(@Param('id') id: string, @Body() body: UpdateProviderStatusDto, @Req() request: Request, @Query('listing') listing?: string) {
    // The actor comes from the session principal set by RolesGuard, never from request headers.
    return successResponse(this.providerOperations.setProviderStatus(providerId(id), listingId(listing), body, request.auth!));
  }

  @Get('provider-operations/providers/:id/documents')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: "List one provider's verification documents from the canonical registry (Provider Operations or superuser)" })
  providerDocuments(@Param('id') id: string, @Query('listing') listing?: string) {
    return successResponse(this.providerOperations.documentList(providerId(id), listingId(listing)));
  }

  @Get('provider-operations/providers/:id/documents/:documentId')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: "Read one verification document's canonical metadata (Provider Operations or superuser)" })
  providerDocument(@Param('id') id: string, @Param('documentId') document: string, @Query('listing') listing?: string) {
    return successResponse(this.providerOperations.documentMetadata(providerId(id), listingId(listing), documentIdParam(document)));
  }

  @Get('provider-operations/providers/:id/documents/:documentId/preview')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: 'Stream the canonical file behind one provider verification document (Provider Operations or superuser)' })
  previewProviderDocument(@Param('id') id: string, @Param('documentId') document: string, @Res() response: Response, @Query('listing') listing?: string) {
    sendDocument(response, this.providerOperations.documentFile(providerId(id), listingId(listing), documentIdParam(document)));
  }

  @Post('provider-operations/providers/:id/documents/:documentId/browser-import')
  @Roles('support', 'admin')
  @Departments('Provider Operations')
  @ApiOperation({ summary: 'Import a document file that the original site kept only in this browser (Provider Operations or superuser)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', documentUploadOptions()))
  importBrowserDocument(@Param('id') id: string, @Param('documentId') document: string, @UploadedFile() file: Express.Multer.File, @Req() request: Request, @Query('listing') listing?: string) {
    return successResponse(this.providerOperations.importBrowserDocument(providerId(id), listingId(listing), documentIdParam(document), file, request.auth!, originOf(request)));
  }
}
