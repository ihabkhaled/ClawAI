import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';

// BigInt serialization support (Prisma returns BigInt for large number fields)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (): number {
  return Number(this);
};


// --- Inline HTTPS bootstrap (no-rebuild path; see scripts/_patch-main-ts-inline.cjs) ---
function resolveHttpsOptions(): { cert: Buffer; key: Buffer } | undefined {
  const certPath = process.env['HTTPS_CERT_PATH'];
  const keyPath = process.env['HTTPS_KEY_PATH'];
  if (certPath === undefined || certPath === '' || keyPath === undefined || keyPath === '') {
    return undefined;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, unicorn/prefer-module
    const fs = require('node:fs');
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  } catch (error) {
    process.stderr.write(`[https-bootstrap] cert read failed: ${error instanceof Error ? error.message : String(error)} — HTTP fallback\n`);
    return undefined;
  }
}

async function bootstrap(): Promise<void> {
  const rabbitLogger = new RabbitMQLoggerService();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, httpsOptions: resolveHttpsOptions() });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? [
    'https://claw.local','https://claw.local:3000',
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
