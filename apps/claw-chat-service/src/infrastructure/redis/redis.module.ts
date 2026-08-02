import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../../app/config/app.config';
import { REDIS_CLIENT, RUNTIME_V2_REDIS_CLIENT } from './constants/redis.constants';
import { RedisService } from './redis.service';
import { RedisClientAdapter } from './redis-client.adapter';
import type { RedisClientPort } from './types/redis-client.types';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): RedisClientPort => {
        const config = AppConfig.get();
        return new RedisClientAdapter(
          new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }),
        );
      },
    },
    {
      provide: RUNTIME_V2_REDIS_CLIENT,
      useFactory: (): RedisClientPort => {
        const config = AppConfig.get();
        return new RedisClientAdapter(
          new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            enableOfflineQueue: false,
            connectTimeout: config.RUNTIME_V2_REDIS_DEADLINE_MS,
            commandTimeout: config.RUNTIME_V2_REDIS_DEADLINE_MS,
          }),
        );
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
