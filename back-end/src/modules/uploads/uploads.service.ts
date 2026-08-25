import { Injectable } from '@nestjs/common';
import { UploadKind } from './upload.config';

@Injectable()
export class UploadsService {
  metadata(kind: UploadKind, file: Express.Multer.File, ownerId?: string) {
    return {
      storedFilename: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      fileUrl: `/uploads/${kind}/${file.filename}`,
      ownerId: ownerId || undefined,
    };
  }
}
