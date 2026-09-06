import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import type { IncomingMessage } from 'node:http';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

import { AuthModule } from '../modules/auth/auth.module';
import { RolesModule } from '../modules/roles/roles.module';
import { PlansModule } from '../modules/plans/plans.module';
import { QuotaModule } from '../modules/quota/quota.module';
import { EntitlementsModule } from '../modules/entitlements/entitlements.module';
import { UsersModule } from '../modules/users/users.module';
import { HealthModule } from '../modules/health/health.module';
import { DeploymentModule } from '../modules/deployment/deployment.module';
import { SystemSettingsModule } from '../modules/system-settings/system-settings.module';
import { CreditModule } from '../modules/credit/credit.module';
import { AdminStatisticsModule } from '../modules/admin-statistics/admin-statistics.module';

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
          serviceName: 'auth-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'auth-service',
      }),
    }),
    PrismaModule,
    RedisModule,
    // auth-service had no scheduler before PAYG credit. Both credit jobs take a
    // Redis lock, so registering one here cannot double-run work if this
    // service is ever scaled past a single replica.
    ScheduleModule.forRoot(),
    AuthModule,
    RolesModule,
    PlansModule,
    QuotaModule,
    EntitlementsModule,
    UsersModule,
    HealthModule,
    DeploymentModule,
    SystemSettingsModule,
    CreditModule,
    AdminStatisticsModule,
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
