import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ServeEaseRequest');
  private readonly logFilePath = join(__dirname, '..', '..', 'logs', 'app.log');

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const startedAt = Date.now();

    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.on('finish', () => {
      const line = `${new Date().toISOString()} [${requestId}] ${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`;
      this.logger.log(line);
      this.writeToFile(line);
    });

    next();
  }

  private writeToFile(line: string): void {
    try {
      mkdirSync(dirname(this.logFilePath), { recursive: true });
      appendFileSync(this.logFilePath, `${line}\n`, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unable to prepare request log file: ${message}`);
    }
  }
}
