import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { AuthGuard, RolesGuard } from '@claw/shared-auth';
import type { IncomingMessage } from 'node:http';

import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HealthModule } from '../modules/health/health.module';
import { AgentModule } from '../modules/agent/agent.module';
import { RecipesModule } from '../modules/recipes/recipes.module';
import { ActivityMemoryModule } from '../modules/activity-memory/activity-memory.module';
import { FleetModule } from '../modules/fleet/fleet.module';
import { MarketplaceModule } from '../modules/marketplace/marketplace.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        autoLogging: true,
        redact: {
          paths: [
            // Phase A — auth + pairing
            'req.headers.authorization',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.accessToken',
            'req.body.pairingCode',
            'req.body.userCode',
            'req.body.deviceCode',
            'req.body.secret',
            'res.body.refreshToken',
            'res.body.accessToken',
            'res.body.pairingCode',
            'res.body.tokens.refreshToken',
            'res.body.tokens.accessToken',
            // V2 Stream 11 — capability framework. The propose body
            // carries arbitrary target/payload — both may contain
            // credentials supplied by the user (BROWSER fill of a
            // password field, FILESYSTEM write of an SSH key, etc.).
            // Wildcards catch all top-level keys named password,
            // token, secret, apiKey, privateKey, etc.
            'req.body.target.password',
            'req.body.target.token',
            'req.body.target.secret',
            'req.body.target.apiKey',
            'req.body.target.privateKey',
            'req.body.target.contentBase64',
            'req.body.payload.password',
            'req.body.payload.token',
            'req.body.payload.secret',
            'req.body.payload.apiKey',
            'req.body.payload.privateKey',
            'req.body.payload.contentBase64',
            'req.body.dsl.steps[*].target.password',
            'req.body.dsl.steps[*].target.token',
            'req.body.dsl.steps[*].payload.password',
            'req.body.dsl.steps[*].payload.token',
            'req.body.dsl.steps[*].payload.contentBase64',
            // Capability completion: output may include secrets the
            // provider read off the user's machine (FILESYSTEM.READ on
            // ~/.aws/credentials, BROWSER.EXTRACT of a logged-in page).
            'req.body.result.password',
            'req.body.result.token',
            'req.body.result.contentBase64',
            // SAML assertions
            'req.body.SAMLResponse',
            // Marketplace signatures (not secret per se, but noisy)
            'req.body.signature',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: 'agent-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'agent-service',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60_000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 2500),
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    HealthModule,
    AgentModule,
    RecipesModule,
    ActivityMemoryModule,
    FleetModule,
    MarketplaceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
