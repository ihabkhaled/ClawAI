import { type IncomingMessage } from 'node:http';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';
import { RabbitMQModule } from '@claw/shared-rabbitmq';

import { AppConfig } from './config/app.config';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { LlamacppEventsModule } from '../common/events/llamacpp-events.module';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

import { BinaryModule } from '../modules/binary/binary.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { HardwareModule } from '../modules/hardware/hardware.module';
import { HealthModule } from '../modules/health/health.module';
import { InferenceModule } from '../modules/inference/inference.module';
import { ModelsLifecycleModule } from '../modules/models-lifecycle/models-lifecycle.module';
import { PullJobsModule } from '../modules/pull-jobs/pull-jobs.module';
import { RuntimeProgressModule } from '../modules/runtime-progress/runtime-progress.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        autoLogging: {
          ignore: (req): boolean => {
            const url = req.url ?? '';
            return (
              url.includes('/v1/chat/completions') ||
              url.includes('/v1/completions') ||
              /\/pull-jobs\/[^/]+\/progress/.test(url)
            );
          },
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.apiKey',
            'req.body.token',
            'req.body.secret',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: 'llamacpp-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'llamacpp-service',
      }),
    }),
    EntitlementsModule.forRoot({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL }),
    PrismaModule,
    LlamacppEventsModule,
    ScheduleModule.forRoot(),
    BinaryModule,
    HardwareModule,
    CatalogModule,
    PullJobsModule,
    ModelsLifecycleModule,
    InferenceModule,
    RuntimeProgressModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60_000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 2500),
      },
    ]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
