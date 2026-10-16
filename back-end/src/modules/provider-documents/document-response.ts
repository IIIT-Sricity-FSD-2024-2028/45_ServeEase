import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'node:fs';
import { memoryStorage } from 'multer';
import { maxDocumentBytes } from './provider-documents.service';

// ASCII-only, quote-free fallback for Content-Disposition; the full name goes in filename*.
const dispositionName = (name: string) => name.replace(/[^\x20-\x7e]|["\\;]/g, '_');

// Streams a canonical document file inline with private, non-sniffable, sandboxed headers.
export function sendDocument(response: Response, file: { path: string; mimeType: string; size: number; originalFilename: string }) {
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader('Content-Length', String(file.size));
  response.setHeader('Content-Disposition', `inline; filename="${dispositionName(file.originalFilename)}"; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`);
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  createReadStream(file.path).on('error', () => response.destroy()).pipe(response);
}

// One file per request, held in memory for validation; no other form fields.
export const documentUploadOptions = () => ({ storage: memoryStorage(), limits: { fileSize: maxDocumentBytes(), files: 1, fields: 0 } });

export const documentIdParam = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) throw new BadRequestException('Invalid document id.');
  return id;
};
