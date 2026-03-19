import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // NestJS logger for structured logging
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType<'http' | 'graphql' | 'ws'>();

    if (this.isMongoDuplicateKeyError(exception)) {
      return this.handleMongoDuplicateKeyError(exception, host, type);
    }

    if (type === 'graphql') {
      if (exception instanceof HttpException) {
        const extracted = this.extractHttpException(exception);
        this.logger.warn(
          `GraphQL HttpException ${extracted.status} – ${JSON.stringify(extracted.message)}`,
        );
        throw exception;
      }
      this.logger.error(
        `GraphQL Unhandled exception`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      throw exception;
    }
    const ctx = host.switchToHttp();

    // Extract response and request objects
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Default values for unexpected errors
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    // Handle known HTTP exceptions
    if (exception instanceof HttpException) {
      const extracted = this.extractHttpException(exception);
      status = extracted.status;
      message = extracted.message;
      error = extracted.error;
    } else {
      // Handle unexpected errors (non-HTTP exceptions)
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Send unified error response to the client
    return res.status(status).json(this.buildErrorResponse(status, error, message, req.url));
  }

  private extractHttpException(exception: HttpException): {
    status: number;
    message: string | string[];
    error: string;
  } {
    const status = exception.getStatus();
    const body = exception.getResponse();

    // Case 1: response body is a string
    if (typeof body === 'string') {
      return {
        status,
        message: body,
        error: exception.name,
      };
    }

    // Case 2: response body is an object
    if (body !== null && typeof body === 'object') {
      const b = body as { message?: string | string[]; error?: string };
      return {
        status,
        message: b.message ?? exception.message,
        error: b.error ?? exception.name,
      };
    }

    // Default case
    return {
      status,
      message: exception.message,
      error: exception.name,
    };
  }

  private handleMongoDuplicateKeyError(
    exception: { code: number; keyPattern?: Record<string, unknown> },
    host: ArgumentsHost,
    type: 'http' | 'graphql' | 'ws',
  ) {
    const duplicatedField = Object.keys(exception.keyPattern ?? {})[0] ?? 'resource';
    const message =
      duplicatedField.charAt(0).toUpperCase() + duplicatedField.slice(1) + ' already in use';

    this.logger.warn(`Handled Mongo duplicate key – ${duplicatedField}`);

    if (type === 'graphql') {
      throw new ConflictException(message);
    }
    if (type !== 'http') {
      throw new ConflictException(message);
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    return res
      .status(HttpStatus.CONFLICT)
      .json(this.buildErrorResponse(HttpStatus.CONFLICT, 'ConflictException', message, req.url));
  }

  private isMongoDuplicateKeyError(exception: unknown): exception is {
    code: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
  } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as { code?: unknown }).code === 11000
    );
  }

  private buildErrorResponse(
    statusCode: number,
    error: string,
    message: string | string[],
    path: string,
  ) {
    return {
      success: false,
      statusCode,
      error,
      message,
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
