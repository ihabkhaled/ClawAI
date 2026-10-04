import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  buildThrottlerOptions,
  RolesGuard,
  SessionRevocationGuard,
} from '@claw/shared-auth';
import { THREAD_GENERATION_SERVICE } from '@claw/shared-constants';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';

import { AppConfig } from './config/app.config';
import { HealthModule } from '../modules/health/health.module';
import { SourceSnapshotsModule } from '../modules/source-snapshots/source-snapshots.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { GenerationModule } from '../modules/generation/generation.module';

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
          serviceName: THREAD_GENERATION_SERVICE,
          requestId: request.headers['x-request-id'],
          traceId: request.headers['x-trace-id'],
        }),
      },
    }),
    ThrottlerModule.forRoot(buildThrottlerOptions({ ttl: 60_000, limit: 2500 })),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: AppConfig.get().RABBITMQ_URL,
        serviceName: 'thread-generation-service',
        queuePrefix: 'claw.threads.generation',
        prefetchCount: 1,
      }),
    }),
    PrismaModule,
    GenerationModule,
    HealthModule,
    SourceSnapshotsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: SessionRevocationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
