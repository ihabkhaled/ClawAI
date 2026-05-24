// Register path aliases at runtime (replaces the build-time path rewrite step).
// Must run before any other @app/* @common/* @infrastructure/* @modules/* import.
import { register as registerTsConfigPaths } from 'tsconfig-paths';

import { NestFactory } from '@nestjs/core';
import * as fs from 'node:fs';
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
    process.stderr.write(`[https-bootstrap] cert read failed: ${error instanceof Error ? error.message : String(error)} — HTTP fallback\n`);
    return undefined;
  }
}

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
