import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { AuthGuard, RolesGuard } from '@claw/shared-auth';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';
import type { IncomingMessage } from 'node:http';

import { AppConfig } from './config/app.config';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HealthModule } from '../modules/health/health.module';
import { WorkspaceModule } from '../modules/workspace/workspace.module';
import { ActionsModule } from '../modules/actions/actions.module';
import { AiActionsModule } from '../modules/ai-actions/ai-actions.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { AutoSuggestModule } from '../modules/auto-suggest/auto-suggest.module';
import { SuggestionFactoryModule } from '../modules/suggestion-factory/suggestion-factory.module';
import { LearningModule } from '../modules/learning/learning.module';
import { InboxModule } from '../modules/inbox/inbox.module';
import { DigestModule } from '../modules/digest/digest.module';
import { TicketPlanningModule } from '../modules/ticket-planning/ticket-planning.module';
import { EmailSignaturesModule } from '../modules/email-signatures/email-signatures.module';
import { EmailTemplatesModule } from '../modules/email-templates/email-templates.module';
import { ConnectorAccessModule } from '../modules/connector-access/connector-access.module';
import { ChainsModule } from '../modules/chains/chains.module';

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
            'req.headers.authorization',
            'req.headers["x-slack-signature"]',
            'req.headers["x-hub-signature"]',
            'req.headers["x-hub-signature-256"]',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.accessToken',
            'req.body.secret',
            'req.body.clientSecret',
            'req.body.personalAccessToken',
            'req.body.apiToken',
            'req.body.secretConfig',
            'req.body.secretConfig.*',
            '*.encryptedSecret',
            '*.encryptedTokens',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: 'workspace-service',
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: 'workspace-service',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env['THROTTLE_TTL'] ?? 60_000),
        limit: Number(process.env['THROTTLE_LIMIT'] ?? 100),
      },
    ]),
    ScheduleModule.forRoot(),
    EntitlementsModule.forRoot({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL }),
    PrismaModule,
    RedisModule,
    HealthModule,
    WorkspaceModule,
    ActionsModule,
    AiActionsModule,
    WebhooksModule,
    AutoSuggestModule,
    SuggestionFactoryModule,
    LearningModule,
    InboxModule,
    DigestModule,
    TicketPlanningModule,
    EmailSignaturesModule,
    EmailTemplatesModule,
    ConnectorAccessModule,
    ChainsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
