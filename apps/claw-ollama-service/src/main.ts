import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

// BigInt serialization support (Prisma returns BigInt for large number fields)
(BigInt.prototype as Record<string, unknown>).toJSON = function (): number { return Number(this); };

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:80', 'http://localhost:4000', 'http://localhost'];
  app.enableCors({ origin: corsOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] });
  await app.listen(AppConfig.get().OLLAMA_PORT);
}

void bootstrap();
