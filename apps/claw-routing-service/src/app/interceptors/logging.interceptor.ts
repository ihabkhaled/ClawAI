import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import {
  RABBITMQ_MODULE_OPTIONS,
  type RabbitMQModuleOptions,
  RabbitMQService,
} from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Optional()
    @Inject(RabbitMQService)
    private readonly rabbitMQService: RabbitMQService | null,
    @Optional()
    @Inject(RABBITMQ_MODULE_OPTIONS)
    private readonly rabbitMQOptions: RabbitMQModuleOptions | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    const traceId = (request.headers['x-trace-id'] as string | undefined) ?? randomUUID();

    request.headers['x-request-id'] = requestId;
    request.headers['x-trace-id'] = traceId;

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-trace-id', traceId);

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

        this.publishLog(method, url, statusCode, duration, requestId, traceId);
      }),
    );
  }

  private publishLog(
    method: string,
    url: string,
    statusCode: number,
    latencyMs: number,
    requestId: string,
    traceId: string,
  ): void {
    if (!this.rabbitMQService || !this.rabbitMQOptions) {
      return;
    }
    void this.rabbitMQService
      .publish(EventPattern.LOG_SERVER, {
        level: statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
        message: `${method} ${url} ${String(statusCode)} - ${String(latencyMs)}ms`,
        serviceName: this.rabbitMQOptions.serviceName,
        action: 'http-request',
        route: url,
        method,
        statusCode,
        latencyMs,
        requestId,
        traceId,
        timestamp: new Date().toISOString(),
      })
      .catch(() => {
        // Never let log publishing break the request
      });
  }
}
