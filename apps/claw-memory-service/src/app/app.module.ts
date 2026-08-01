import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';
import type { IncomingMessage } from 'node:http';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AppConfig } from './config/app.config';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

import { MemoryModule } from '../modules/memory/memory.module';
import { ContextPacksModule } from '../modules/context-packs/context-packs.module';
import { ContextPackVersionsModule } from '../modules/context-pack-versions/context-pack-versions.module';
import { ContextPackTemplatesModule } from '../modules/context-pack-templates/context-pack-templates.module';
import { ContextPackPortableModule } from '../modules/context-pack-portable/context-pack-portable.module';
import { MemoryPortableModule } from '../modules/memory-portable/memory-portable.module';
import { EmbeddingsModule } from '../modules/embeddings/embeddings.module';
import { HealthModule } from '../modules/health/health.module';

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
            'req.body.refreshToken',
            'req.body.apiKey',
            'req.body.token',
            'req.body.secret',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: 'memory-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'memory-service',
      }),
    }),
    EntitlementsModule.forRoot({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL }),
    PrismaModule,
    RedisModule,
    MemoryModule,
    ContextPacksModule,
    ContextPackVersionsModule,
    ContextPackTemplatesModule,
    ContextPackPortableModule,
    MemoryPortableModule,
    EmbeddingsModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 2500),
      },
    ]),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
