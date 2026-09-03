import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class UploadOwnerContextMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const header = request.headers['user-id'];
    const ownerId = Array.isArray(header) ? header[0] : header;

    if (typeof ownerId !== 'string' || ownerId.trim().length === 0) {
      throw new BadRequestException('A non-empty user-id header is required for uploads.');
    }

    next();
  }
}
