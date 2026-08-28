import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../../app/config/app.config';
import {
  CHAT_STREAM_SUBSCRIBER_CLIENT,
  REDIS_CLIENT,
  RUNTIME_V2_REDIS_CLIENT,
  STREAM_CANCEL_SUBSCRIBER_CLIENT,
} from './constants/redis.constants';
import { RedisService } from './redis.service';
import { RedisClientAdapter, RedisSubscriberAdapter } from './redis-client.adapter';
import type { RedisClientPort, RedisSubscriberPort } from './types/redis-client.types';

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
    {
      provide: CHAT_STREAM_SUBSCRIBER_CLIENT,
      useFactory: (): RedisSubscriberPort => {
        const config = AppConfig.get();
        return new RedisSubscriberAdapter(
          // Retries are unlimited on purpose. A subscriber that gives up leaves
          // this replica connected to clients it can never send another frame
          // to, and nothing else in the system would notice.
          new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }),
        );
      },
    },
    {
      provide: STREAM_CANCEL_SUBSCRIBER_CLIENT,
      useFactory: (): RedisSubscriberPort => {
        const config = AppConfig.get();
        return new RedisSubscriberAdapter(
          new Redis(config.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }),
        );
      },
    },
    RedisService,
  ],
  exports: [
    RedisService,
    CHAT_STREAM_SUBSCRIBER_CLIENT,
    STREAM_CANCEL_SUBSCRIBER_CLIENT,
    REDIS_CLIENT,
  ],
})
export class RedisModule {}
