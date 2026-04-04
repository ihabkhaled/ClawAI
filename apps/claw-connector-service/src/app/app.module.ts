import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";

import { PrismaModule } from "../infrastructure/database/prisma/prisma.module";
import { RedisModule } from "../infrastructure/redis/redis.module";

import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";

import { HealthModule } from "../modules/health/health.module";
import { ConnectorsModule } from "../modules/connectors/connectors.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env["NODE_ENV"] !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
        level: process.env["NODE_ENV"] !== "production" ? "debug" : "info",
        autoLogging: true,
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    ConnectorsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
