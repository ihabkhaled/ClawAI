import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { HealthModule } from "../modules/health/health.module";

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
    HealthModule,
  ],
})
export class AppModule {}
