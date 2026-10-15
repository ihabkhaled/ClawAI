import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import {
  AuthGuard,
  buildThrottlerOptions,
  RolesGuard,
  SessionRevocationGuard,
} from '@claw/shared-auth';
import { THREADS_SERVICE } from '@claw/shared-constants';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';

import { AppConfig } from './config/app.config';
import { HealthModule } from '../modules/health/health.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { PublicationsModule } from '../modules/publications/publications.module';
import { PublicationFormatModule } from '../modules/publication-format/publication-format.module';
import { BoardModule } from '../modules/board/board.module';
import { AccountDeletionModule } from '../modules/account-deletion/account-deletion.module';

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
            'req.body.email',
          ],
          censor: '[REDACTED]',
        },
        customProps: (request) => ({
          serviceName: THREADS_SERVICE,
          requestId: request.headers['x-request-id'],
          traceId: request.headers['x-trace-id'],
        }),
      },
    }),
    ThrottlerModule.forRoot(buildThrottlerOptions({ ttl: 60_000, limit: 2500 })),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: AppConfig.get().RABBITMQ_URL,
        serviceName: 'threads-service',
        queuePrefix: 'claw.threads',
        prefetchCount: 1,
      }),
    }),
    EntitlementsModule.forRoot({
      authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
      interServiceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
    }),
    HealthModule,
    PrismaModule,
    // BoardModule first: its `public/board` route must register before `public/:slug`.
    BoardModule,
    PublicationsModule,
    PublicationFormatModule,
    AccountDeletionModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: SessionRevocationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
