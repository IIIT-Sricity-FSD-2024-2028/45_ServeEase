import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { uploadOptions } from '../../middleware/upload.config';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiHeader({ name: 'role', required: true })
@UseGuards(RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('verification')
  @Roles('user', 'provider', 'admin', 'superuser')
  @ApiOperation({ summary: 'Upload a provider verification document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions('verification')))
  verification(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    return this.respond('verification', file, request);
  }

  @Post('tickets')
  @Roles('user', 'provider', 'admin', 'superuser')
  @ApiOperation({ summary: 'Upload a support ticket attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions('tickets')))
  ticket(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    return this.respond('tickets', file, request);
  }

  @Post('profiles/photo')
  @Roles('provider', 'admin', 'superuser')
  @ApiOperation({ summary: 'Upload a provider profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions('profiles')))
  profilePhoto(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    return this.respond('profiles', file, request);
  }

  private respond(kind: 'verification' | 'tickets' | 'profiles', file: Express.Multer.File | undefined, request: Request) {
    if (!file) throw new BadRequestException('A file is required.');
    const header = request.headers['user-id'];
    const ownerId = Array.isArray(header) ? header[0] : header;
    return { success: true, data: this.uploadsService.metadata(kind, file, ownerId) };
  }
}
