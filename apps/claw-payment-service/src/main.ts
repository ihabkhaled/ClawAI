import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { resolveHttpsOptions } from '@claw/shared-utilities';
import { API_PREFIX, PAYMENT_SERVICE } from '@claw/shared-constants';

import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions: resolveHttpsOptions(),
    // Gateway webhooks are signed over the EXACT bytes that were sent. Express
    // must therefore hand us the untouched raw body for the webhook routes, or
    // signature verification will fail against a re-serialized JSON object.
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);

  const clawHost = process.env['CLAW_HOSTNAME'] ?? 'claw.local';
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? [
    `https://${clawHost}`,
    `https://${clawHost}:3000`,
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
  });

  try {
    const rabbitMQ = app.get(RabbitMQService);
    const rabbitLogger = new RabbitMQLoggerService();
    rabbitLogger.setRabbitMQ(rabbitMQ, PAYMENT_SERVICE);
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available — continue with pino only
  }

  await app.listen(process.env['PORT'] ?? config.PAYMENT_SERVICE_PORT);
}

void bootstrap();
