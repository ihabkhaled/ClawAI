import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import {
  AuthGuard,
  buildThrottlerOptions,
  RolesGuard,
  SessionRevocationGuard,
} from '@claw/shared-auth';
import { PLUGIN_SERVICE } from '@claw/shared-constants';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';

import { AppConfig } from './config/app.config';
import { HealthModule } from '../modules/health/health.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { SeedingModule } from '../modules/seeding/seeding.module';

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
            'req.body.value',
            'req.body.credential',
            'req.body.email',
          ],
          censor: '[REDACTED]',
        },
        customProps: (request) => ({
          serviceName: PLUGIN_SERVICE,
          requestId: request.headers['x-request-id'],
          traceId: request.headers['x-trace-id'],
        }),
      },
    }),
    ThrottlerModule.forRoot(buildThrottlerOptions({ ttl: 60_000, limit: 2500 })),
    EntitlementsModule.forRoot({
      authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
      interServiceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
    }),
    HealthModule,
    PrismaModule,
    CatalogModule,
    SeedingModule,
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
