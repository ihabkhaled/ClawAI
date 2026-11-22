import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import {
  AuthGuard,
  buildThrottlerOptions,
  RolesGuard,
  SessionRevocationGuard,
} from '@claw/shared-auth';
import { LIVE_SERVICE } from '@claw/shared-constants';
import { EntitlementsModule } from '@claw/shared-entitlements';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppConfig } from './config/app.config';
import { AdminModule } from '../modules/admin/admin.module';
import { BillingModule } from '../modules/billing/billing.module';
import { DeletionModule } from '../modules/deletion/deletion.module';
import { EnhanceModule } from '../modules/enhance/enhance.module';
import { HealthModule } from '../modules/health/health.module';
import { HistoryModule } from '../modules/history/history.module';
import { PolicyModule } from '../modules/policy/policy.module';
import { ProcessingModule } from '../modules/processing/processing.module';
import { RealtimeModule } from '../modules/realtime/realtime.module';
import { SessionsModule } from '../modules/sessions/sessions.module';
import { SourcesModule } from '../modules/sources/sources.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: AppConfig.get().NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.token',
            'req.body.secret',
            'req.body.url',
            'req.body.email',
          ],
          censor: '[REDACTED]',
        },
        customProps: (request) => ({
          serviceName: LIVE_SERVICE,
          requestId: request.headers['x-request-id'],
          traceId: request.headers['x-trace-id'],
        }),
      },
    }),
    ThrottlerModule.forRoot(buildThrottlerOptions({ ttl: 60_000, limit: 2500 })),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: AppConfig.get().RABBITMQ_URL,
        serviceName: 'live-service',
        queuePrefix: 'claw.live',
        prefetchCount: 1,
      }),
    }),
    EntitlementsModule.forRoot({
      authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
      interServiceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
    }),
    HealthModule,
    PrismaModule,
    RedisModule,
    PolicyModule,
    RealtimeModule,
    SourcesModule,
    ProcessingModule,
    BillingModule,
    SessionsModule,
    HistoryModule,
    EnhanceModule,
    DeletionModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: SessionRevocationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
