import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const method = req.method;
    const path = req.originalUrl ?? req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.http({
            method,
            path,
            statusCode: res.statusCode,
            durationMs: ms,
          });
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status = err instanceof HttpException ? err.getStatus() : 500;
          const message = err instanceof Error ? err.message : 'Error';

          const stack = err instanceof Error ? err.stack : undefined;

          const line = `${method} ${path} ${status} – ${ms}ms – ${message}`;

          if (status >= 500) this.logger.error(line, stack, 'HTTP');
          else this.logger.warn(line, 'HTTP');
        },
      }),
    );
  }
}
