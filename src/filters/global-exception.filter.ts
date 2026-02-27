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
            status = exception.getStatus();
            const body = exception.getResponse();

            // If the response body is a simple string
            if (typeof body === 'string') {
                message = body;

                // If the response body is an object
            } else if (body && typeof body === 'object') {
                const b = body as any;

                // Extract message and error if present
                message = b.message ?? exception.message;
                error = b.error ?? exception.name;

                // Fallback handling
            } else {
                message = exception.message;
                error = exception.name;
            }
        } else {

            // Handle unexpected errors (non-HTTP exceptions)
            this.logger.error(
                `Unhandled exception on ${req.method} ${req.url}`,
                (exception as any)?.stack ?? String(exception),
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
}