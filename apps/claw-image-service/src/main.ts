import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.useBodyParser('json', { limit: '75mb' });
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
  await app.listen(AppConfig.get().IMAGE_PORT);
}

void bootstrap();
