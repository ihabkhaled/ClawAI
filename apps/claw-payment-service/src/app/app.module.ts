import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { AuthGuard, RolesGuard } from '@claw/shared-auth';
import { EntitlementsModule, PermissionGuard } from '@claw/shared-entitlements';
import { PAYMENT_SERVICE } from '@claw/shared-constants';
import type { IncomingMessage } from 'node:http';

import { AppConfig } from './config/app.config';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { BillingModule } from '../modules/billing/billing.module';
import { CheckoutModule } from '../modules/checkout/checkout.module';
import { PlanCatalogModule } from '../modules/plan-catalog/plan-catalog.module';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { FxModule } from '../modules/fx/fx.module';
import { OutboxModule } from '../modules/outbox/outbox.module';
import { GatewaysModule } from '../modules/gateways/gateways.module';
import { HealthModule } from '../modules/health/health.module';
import { ReconciliationModule } from '../modules/reconciliation/reconciliation.module';
import { InternalPaymentsModule } from '../modules/internal-payments/internal-payments.module';

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
        // Redaction list is deliberately broad. A payment service handles more
        // secret-shaped fields than any other, and a leaked gateway token or
        // signature header in a log is a full compromise of that credential.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["paypal-auth-algo"]',
            'req.headers["paypal-cert-url"]',
            'req.headers["paypal-transmission-sig"]',
            'req.headers["paypal-transmission-id"]',
            'req.headers["x-paymob-signature"]',
            'req.body',
            'res.body',
            '*.clientSecret',
            '*.secretKey',
            '*.apiKey',
            '*.hmac',
            '*.hmacSecret',
            '*.encryptedToken',
            '*.gatewayCustomerId',
            '*.gatewaySubscriptionId',
            '*.providerPaymentMethodToken',
            '*.accessToken',
            '*.refreshToken',
            '*.cardNumber',
            '*.cvv',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => ({
          serviceName: PAYMENT_SERVICE,
          requestId: req.headers['x-request-id'] ?? undefined,
          traceId: req.headers['x-trace-id'] ?? undefined,
        }),
      },
    }),
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        url: process.env['RABBITMQ_URL'] ?? 'amqp://localhost:5672',
        serviceName: PAYMENT_SERVICE,
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
    GatewaysModule,
    FxModule,
    OutboxModule,
    BillingModule,
    PlanCatalogModule,
    CheckoutModule,
    SubscriptionsModule,
    WebhooksModule,
    ReconciliationModule,
    InternalPaymentsModule,
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
