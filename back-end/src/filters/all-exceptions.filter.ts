import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ServeEaseError');
  private readonly logDirectory = join(__dirname, '..', '..', 'logs');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = this.getStatus(exception);
    const responseBody = this.getResponseBody(exception, status);
    const errorName = exception instanceof Error ? exception.name : exception?.constructor?.name || 'UnknownException';
    const message = this.getMessage(responseBody);
    const requestId = request.requestId || 'unknown-request';
    const line = `${new Date().toISOString()} [${requestId}] ${request.method} ${request.path} ${status} ${errorName} ${message}`;

    this.logger.error(line);
    if (status >= 500 && exception instanceof Error && exception.stack) {
      this.logger.error(exception.stack);
    }
    this.writeToFile(line, status >= 500 && exception instanceof Error ? exception.stack : undefined);

    if (response.headersSent) {
      response.end();
      return;
    }

    response.status(status).json(responseBody);
  }

  private getResponseBody(exception: unknown, status: number): Record<string, unknown> {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        return exceptionResponse as Record<string, unknown>;
      }
      return { statusCode: status, message: exceptionResponse };
    }

    if (status !== 500 && exception instanceof Error) {
      return { statusCode: status, message: exception.message };
    }

    return { statusCode: 500, message: 'Internal server error' };
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    if (!exception || typeof exception !== 'object') return 500;

    const candidate = exception as { status?: unknown; statusCode?: unknown };
    const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
    return typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
  }

  private getMessage(responseBody: Record<string, unknown>): string {
    const message = responseBody.message;
    if (Array.isArray(message)) return message.join('; ');
    return String(message || 'Request failed').replace(/\s+/g, ' ').trim();
  }

  private writeToFile(line: string, stack?: string): void {
    try {
      mkdirSync(this.logDirectory, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      appendFileSync(join(this.logDirectory, `error-${date}.log`), `${line}${stack ? `\n${stack}` : ''}\n`, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unable to prepare error log file: ${message}`);
    }
  }
}
