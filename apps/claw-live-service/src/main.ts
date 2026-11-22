import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { raw } from 'express';
import { API_PREFIX } from '@claw/shared-constants';
import { resolveHttpsOptions } from '@claw/shared-utilities';

import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';
import {
  LIVE_CAPTURE_AUDIO_ROUTE,
  LIVE_CAPTURE_BODY_LIMIT,
  LIVE_CAPTURE_CONTENT_TYPE,
} from './modules/sessions/constants/live-capture.constants';

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions: resolveHttpsOptions(),
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  // Browser capture: raw audio/wav for the audio route only (before Nest's JSON parser).
  app.use(
    LIVE_CAPTURE_AUDIO_ROUTE,
    raw({ type: LIVE_CAPTURE_CONTENT_TYPE, limit: LIVE_CAPTURE_BODY_LIMIT }),
  );
  app.setGlobalPrefix(API_PREFIX);

  const origins = config.CORS_ORIGINS?.split(',') ?? [
    `https://${config.CLAW_HOSTNAME}`,
    `https://${config.CLAW_HOSTNAME}:3000`,
  ];
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Accept-Language',
      'X-Chunk-Start-At',
    ],
  });

  await app.listen(config.LIVE_SERVICE_PORT);
}

void bootstrap();
