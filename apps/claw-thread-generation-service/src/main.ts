import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { API_PREFIX } from '@claw/shared-constants';
import { resolveHttpsOptions } from '@claw/shared-utilities';

import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

/** A 1,000,000-character topic: 4 bytes a character at worst, plus the chat snapshot. */
const JSON_BODY_LIMIT = '16mb';

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    httpsOptions: resolveHttpsOptions(),
  });
  // Express defaults to 100 KB; the enqueue body carries a topic of up to a million characters
  // and the chat snapshot beside it.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);

  const origins = config.CORS_ORIGINS?.split(',') ?? [
    `https://${config.CLAW_HOSTNAME}`,
    `https://${config.CLAW_HOSTNAME}:3000`,
  ];
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  await app.listen(config.THREAD_GENERATION_SERVICE_PORT);
}

void bootstrap();
