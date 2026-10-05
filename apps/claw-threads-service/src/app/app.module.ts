import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import {
  AuthGuard,
  buildThrottlerOptions,
  RolesGuard,
  SessionRevocationGuard,
} from '@claw/shared-auth';
import { THREADS_SERVICE } from '@claw/shared-constants';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppConfig } from './config/app.config';
import { HealthModule } from '../modules/health/health.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { PublicationsModule } from '../modules/publications/publications.module';

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
    HealthModule,
    PrismaModule,
    PublicationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: SessionRevocationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
