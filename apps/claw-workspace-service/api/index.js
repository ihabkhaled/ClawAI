/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/vercel/generate-configs.mjs
 *
 * Vercel serverless entry for claw-workspace-service.
 *
 * Mirrors the bootstrap in src/main.ts with one deliberate difference: it never
 * calls app.listen(). A Vercel function is handed an incoming request and must
 * return the Express handler, not bind a port.
 *
 * The compiled dist/ output is required (not src/) because NestJS dependency
 * injection relies on emitDecoratorMetadata, which only the tsgo build emits.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');

const { AppModule } = require('../dist/app/app.module');

/**
 * Cached across warm invocations. Booting Nest costs hundreds of milliseconds,
 * so the first request pays for it and the rest of that instance's lifetime
 * reuses it. The promise (not the app) is cached so two concurrent cold
 * requests cannot bootstrap twice.
 */
let appPromise;

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
    // No httpsOptions: TLS terminates at Vercel's edge, not in the function.
  });

  app.use(helmet());

  // workspace: webhook signature verification needs the raw request body,
  // so the raw parser is mounted on the webhook prefix before the JSON parser.
  const rawLimit = Number(process.env['WEBHOOK_BODY_MAX_BYTES'] ?? 1048576);
  app.use(new RegExp('^\/api\/v1\/workspace\/webhooks\/.+'), express.raw({ type: '*/*', limit: rawLimit + 'b' }));
  app.use(express.json({ limit: '10mb' }));

  app.setGlobalPrefix('api/v1');

  const corsOrigins = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  try {
    const { RabbitMQService, RabbitMQLoggerService } = require('@claw/shared-rabbitmq');
    const rabbitLogger = new RabbitMQLoggerService();
    rabbitLogger.setRabbitMQ(app.get(RabbitMQService), 'workspace-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ unavailable — fall through to the default logger rather than
    // failing the whole request. Log delivery is best-effort here.
  }

  await app.init();
  return server;
}

module.exports = async function handler(request, response) {
  if (appPromise === undefined) {
    appPromise = bootstrap().catch((error) => {
      // Clear the cache so the next invocation retries instead of serving a
      // permanently poisoned promise for the life of the instance.
      appPromise = undefined;
      throw error;
    });
  }
  const server = await appPromise;
  return server(request, response);
};
