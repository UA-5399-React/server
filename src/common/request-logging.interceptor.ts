import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { GraphQLResolveInfo } from 'graphql/type';
import { catchError, Observable, tap, throwError } from 'rxjs';

import { AppLogger } from '@/logger/app-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const type = context.getType<'http' | 'graphql' | 'ws' | 'rpc'>();
    const start = Date.now();

    if (type === 'http') {
      const httpCtx = context.switchToHttp();
      const req = httpCtx.getRequest<Request>();
      const res = httpCtx.getResponse<Response>();
      const method = req.method;
      const path = req.originalUrl ?? req.url;

      return next.handle().pipe(
        tap(() => {
          this.logger.http('HTTP request', {
            method,
            path,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        }),
        catchError((err: unknown) => {
          const ms = Date.now() - start;
          const status = err instanceof HttpException ? err.getStatus() : 500;
          const message = err instanceof Error ? err.message : 'Error';
          const stack = err instanceof Error ? err.stack : undefined;
          const line = `${method} ${path} ${status} – ${ms}ms – ${message}`;

          if (status >= 500) this.logger.error(line, stack, 'HTTP');
          else this.logger.warn(line, 'HTTP');
          return throwError(() => err);
        }),
      );
    }

    if (type === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo<GraphQLResolveInfo>();
      const operation = info.operation?.operation;
      const field = info.fieldName;
      const operationName = info.operation?.name?.value ?? field;

      return next.handle().pipe(
        tap(() => {
          this.logger.graphql('GraphQL request', {
            operation,
            operationName,
            field,
            duration: `${Date.now() - start}ms`,
          });
        }),
        catchError((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error';
          const stack = err instanceof Error ? err.stack : undefined;

          const line = `GraphQL ${operation ?? 'operation'} ${operationName ?? field} – ${
            Date.now() - start
          }ms – ${message}`;

          this.logger.error(line, stack, 'GraphQL');

          return throwError(() => err);
        }),
      );
    }
    return next.handle().pipe(
      tap(() => {
        this.logger.http('Request', {
          type,
          durationMs: Date.now() - start,
        });
      }),
      catchError((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error';
        const stack = err instanceof Error ? err.stack : undefined;

        const line = `${type} request – ${Date.now() - start}ms – ${message}`;
        this.logger.error(line, stack, type.toUpperCase());

        return throwError(() => err);
      }),
    );
  }
}
