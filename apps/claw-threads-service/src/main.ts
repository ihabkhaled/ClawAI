import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { API_PREFIX } from '@claw/shared-constants';
import { resolveHttpsOptions } from '@claw/shared-utilities';

import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions: resolveHttpsOptions(),
  });
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

  await app.listen(config.THREADS_SERVICE_PORT);
}

void bootstrap();
