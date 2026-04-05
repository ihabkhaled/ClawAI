import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const traceId =
      (request.headers["x-trace-id"] as string | undefined) ?? randomUUID();

    request.headers["x-request-id"] = requestId;
    request.headers["x-trace-id"] = traceId;

    response.setHeader("x-request-id", requestId);
    response.setHeader("x-trace-id", traceId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        const statusCode = response.statusCode;
        this.logger.log(
          {
            requestId,
            traceId,
            method,
            url,
            statusCode,
            durationMs: duration,
          },
          `${method} ${url} ${statusCode} - ${duration}ms`,
        );
      }),
    );
  }
}
