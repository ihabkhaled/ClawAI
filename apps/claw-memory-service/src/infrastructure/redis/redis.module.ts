import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { AppConfig } from "../../app/config/app.config";
import { REDIS_CLIENT } from "./constants/redis.constants";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const config = AppConfig.get();
        return new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
