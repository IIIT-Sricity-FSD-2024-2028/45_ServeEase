import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type UploadKind = 'verification' | 'tickets' | 'profiles';

const uploadRules: Record<UploadKind, { maxSize: number; mimeTypes: string[]; extensions: string[] }> = {
  verification: { maxSize: 5 * 1024 * 1024, mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], extensions: ['.pdf', '.jpg', '.jpeg', '.png'] },
  tickets: { maxSize: 5 * 1024 * 1024, mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] },
  profiles: { maxSize: 2 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], extensions: ['.jpg', '.jpeg', '.png', '.webp'] },
};

export function uploadOptions(kind: UploadKind) {
  const rule = uploadRules[kind];
  return {
    limits: { fileSize: rule.maxSize, files: 1 },
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const directory = join(process.cwd(), 'uploads', kind);
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_request, file, callback) => {
        callback(null, `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    fileFilter: (_request: unknown, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
      const extension = extname(file.originalname).toLowerCase();
      if (!rule.mimeTypes.includes(file.mimetype) || !rule.extensions.includes(extension)) {
        callback(new BadRequestException('Unsupported file type.'), false);
        return;
      }
      callback(null, true);
    },
  };
}
