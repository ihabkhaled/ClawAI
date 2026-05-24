import { NestFactory } from '@nestjs/core';
import { resolveHttpsOptions } from '@claw/shared-utilities';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

// BigInt serialization support (Prisma returns BigInt for large number fields)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (): number {
  return Number(this);
};

async function bootstrap(): Promise<void> {
  const rabbitLogger = new RabbitMQLoggerService();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, httpsOptions: resolveHttpsOptions() });
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
    rabbitLogger.setRabbitMQ(rabbitMQ, 'ollama-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available — continue with pino only
  }

  await app.listen(AppConfig.get().OLLAMA_PORT);
}

void bootstrap();
