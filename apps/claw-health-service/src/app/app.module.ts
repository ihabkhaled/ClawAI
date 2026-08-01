import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
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
          serviceName: 'health-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
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
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
