import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app/app.module";
import { AppConfig } from "./app/config/app.config";

async function bootstrap(): Promise<void> {
  const config = AppConfig.validate();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("api/v1");
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:80', 'http://localhost'];
  app.enableCors({ origin: corsOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] });

  await app.listen(config.PORT);
}

void bootstrap();
