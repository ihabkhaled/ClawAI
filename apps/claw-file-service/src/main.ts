import { NestFactory } from '@nestjs/core';
import * as fs from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RabbitMQLoggerService, RabbitMQService } from '@claw/shared-rabbitmq';
import { AppModule } from './app/app.module';
import { AppConfig } from './app/config/app.config';


// --- Inline HTTPS bootstrap (no-rebuild path; see scripts/_patch-main-ts-inline.cjs) ---
function resolveHttpsOptions(): { cert: Buffer; key: Buffer } | undefined {
  const certPath = process.env['HTTPS_CERT_PATH'];
  const keyPath = process.env['HTTPS_KEY_PATH'];
  if (certPath === undefined || certPath === '' || keyPath === undefined || keyPath === '') {
    return undefined;
  }
  try {
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  } catch (error) {
    process.stderr.write(`[https-bootstrap] cert read failed: ${error instanceof Error ? error.message : String(error)} â€” HTTP fallback\n`);
    return undefined;
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, httpsOptions: resolveHttpsOptions() });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  // Allow large file uploads (base64-encoded in JSON body, up to 75MB)
  app.useBodyParser('json', { limit: '75mb' });
  app.setGlobalPrefix('api/v1');
  const clawHost = process.env['CLAW_HOSTNAME'] ?? 'claw.local';
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? [
    `https://${clawHost}`,`https://${clawHost}:3000`,
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
    rabbitLogger.setRabbitMQ(rabbitMQ, 'file-service');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ not available â€” continue with pino only
  }

  await app.listen(AppConfig.get().FILES_PORT);
}

void bootstrap();
