// Register path aliases at runtime (replaces the build-time path rewrite step).
// Must run before any other @app/* @common/* @infrastructure/* @modules/* import.
import { register as registerTsConfigPaths } from 'tsconfig-paths';

import { NestFactory } from '@nestjs/core';
import { resolveHttpsOptions } from '@claw/shared-utilities';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

registerTsConfigPaths({
  baseUrl: __dirname,
  paths: {
    '@app/*': ['app/*'],
    '@common/*': ['common/*'],
    '@infrastructure/*': ['infrastructure/*'],
    '@modules/*': ['modules/*'],
  },
});

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions: resolveHttpsOptions(),
  });

  app.useLogger(app.get(Logger));
  app.use(helmet());
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
    rabbitLogger.setRabbitMQ(rabbitMQ, 'chat-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available — continue with pino only
  }

  app.enableShutdownHooks();
  await app.listen(config.CHAT_PORT, '0.0.0.0');
}

void bootstrap();
