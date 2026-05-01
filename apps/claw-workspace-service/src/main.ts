import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { json, raw } from 'express';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());

  // Webhook receiver needs the raw body for HMAC verification — apply raw
  // parser only to webhook routes; everything else stays on JSON.
  app.use(
    /^\/api\/v1\/workspace\/webhooks\/.+/,
    raw({ type: '*/*', limit: `${config.WEBHOOK_BODY_MAX_BYTES}b` }),
  );
  app.use(json({ limit: '10mb' }));

  app.setGlobalPrefix('api/v1');

  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:80',
    'http://localhost:4000',
    'http://localhost',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  try {
    const rabbitMQ = app.get(RabbitMQService);
    const rabbitLogger = new RabbitMQLoggerService();
    rabbitLogger.setRabbitMQ(rabbitMQ, 'workspace-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available — continue with pino only
  }

  await app.listen(config.WORKSPACE_PORT);
}

void bootstrap();
