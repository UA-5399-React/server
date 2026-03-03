import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
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
    // Switch execution context to HTTP
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
    return res.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
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
}
