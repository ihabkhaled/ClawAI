import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { EntitlementsModule } from '@claw/shared-entitlements';
import type { IncomingMessage } from 'node:http';

import { AppConfig } from './config/app.config';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

import { ImageGenerationModule } from '../modules/image-generation/image-generation.module';
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
        customLogLevel: (req, res, error) => {
          const isRoutineHealth = (req.url ?? '').split('?')[0] === '/api/v1/health';
          if (isRoutineHealth && res.statusCode < 400 && error === undefined) {
            return 'silent';
          }
          if (res.statusCode >= 500 || error !== undefined) {
            return 'error';
          }
          if (res.statusCode >= 400) {
            return 'warn';
          }
          return 'info';
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
          serviceName: 'image-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'image-service',
      }),
    }),
    // @Global() — provides PaygMeter by CLASS token to every module below.
    // Image generation calls OpenAI and Gemini with real money; without this
    // import the manager's `PaygMeter` injection fails at boot instead of
    // silently metering nothing, which is the intended failure direction.
    EntitlementsModule.forRoot({
      authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
      interServiceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
    }),
    PrismaModule,
    RedisModule,
    ImageGenerationModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 2500),
      },
    ]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
