import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { AuthGuard, RolesGuard } from '@claw/shared-auth';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';
import type { IncomingMessage } from 'node:http';

import { AppConfig } from './config/app.config';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { FetchModule } from '../modules/fetch/fetch.module';
import { HealthModule } from '../modules/health/health.module';
import { ResearchModule } from '../modules/research/research.module';
import { ScrapeModule } from '../modules/scrape/scrape.module';
import { SearchModule } from '../modules/search/search.module';
import { ResearchUsageModule } from '../common/services/research-usage.module';

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
          ignore: (req: IncomingMessage): boolean =>
            (req.url ?? '').split('?')[0] === '/api/v1/health',
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.apiKey',
            'req.body.secret',
            'req.body.secretConfig',
            'req.body.secretConfig.*',
            '*.encryptedSecret',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: 'research-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'research-service',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60_000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 2500),
      },
    ]),
    EntitlementsModule.forRoot({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL }),
    ResearchUsageModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    SearchModule,
    FetchModule,
    ScrapeModule,
    ResearchModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
