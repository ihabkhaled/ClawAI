import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (): number {
  return Number(this);
};

async function bootstrap(): Promise<void> {
  const rabbitLogger = new RabbitMQLoggerService();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
    rabbitLogger.setRabbitMQ(rabbitMQ, 'llamacpp-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available — continue with pino only
  }

  await app.listen(Number(AppConfig.get().LLAMACPP_PORT));
}

void bootstrap();
