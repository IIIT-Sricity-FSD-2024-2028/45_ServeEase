import { Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Request, Response } from 'express';
import { successResponse } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { documentIdParam, documentUploadOptions, sendDocument } from './document-response';
import { ProviderDocumentsService } from './provider-documents.service';

const fileBody = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

// Provider-side access to the provider's own verification documents. Ownership always comes from the
// session principal; no provider or account id is accepted from the caller.
@ApiTags('provider-verification-documents')
@UseGuards(RolesGuard)
@Controller('provider/verification-documents')
export class ProviderDocumentsController {
  constructor(private readonly documents: ProviderDocumentsService) {}

  @Get()
  @Roles('provider')
  @ApiOperation({ summary: 'List your own verification documents (canonical metadata)' })
  list(@Req() request: Request) {
    return successResponse(this.documents.list(this.documents.ownProviderAccount(request.auth!)));
  }

  @Get(':documentId/file')
  @Roles('provider')
  @ApiOperation({ summary: 'Stream the canonical file of one of your own verification documents' })
  file(@Param('documentId') documentId: string, @Req() request: Request, @Res() response: Response) {
    sendDocument(response, this.documents.file(this.documents.ownProviderAccount(request.auth!), documentIdParam(documentId)));
  }

  @Post(':documentId/file')
  @Roles('provider')
  @ApiOperation({ summary: 'Upload the file for one of your own verification documents (PNG, JPEG or PDF; account must be under verification)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', documentUploadOptions()))
  upload(@Param('documentId') documentId: string, @UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    return successResponse(this.documents.upload(request.auth!, documentIdParam(documentId), file));
  }

  @Post(':documentId/browser-import')
  @Roles('provider')
  @ApiOperation({ summary: 'Import the file of one of your own documents that the original site kept only in this browser' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', documentUploadOptions()))
  importFromBrowser(@Param('documentId') documentId: string, @UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    const account = this.documents.ownProviderAccount(request.auth!);
    return successResponse(this.documents.importFromBrowser(account, documentIdParam(documentId), file, { ...request.auth!, role: 'provider' }, originOf(request)));
  }
}

export class MigrationRequestDto {
  @IsOptional()
  @IsBoolean()
  apply?: boolean;
}

// Superuser-only migration of existing documents into canonical storage. Runs inside the server, so the
// running process remains the only writer of the state file.
@ApiTags('provider-document-migration')
@UseGuards(RolesGuard)
@Controller('admin/provider-documents/migrations')
export class ProviderDocumentMigrationController {
  constructor(private readonly documents: ProviderDocumentsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Report (default) or apply the consolidation of existing provider documents into canonical storage (superuser)' })
  migrate(@Body() body: MigrationRequestDto, @Req() request: Request) {
    return successResponse(this.documents.migrate({ apply: body?.apply === true, actor: `Superuser (${request.auth!.userId})` }));
  }

  @Post(':runId/rollback')
  @Roles('admin')
  @ApiOperation({ summary: 'Roll back one applied migration run (superuser)' })
  rollback(@Param('runId') runId: string) {
    return successResponse(this.documents.rollback(runId));
  }
}

export const originOf = (request: Request) => {
  const origin = request.headers.origin;
  return typeof origin === 'string' && /^https?:\/\/[A-Za-z0-9.:[\]-]{1,100}$/.test(origin) ? origin : null;
};
