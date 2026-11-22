import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

import { AppConfig } from '../../app/config/app.config';
import { LIVE_REDIS_CLIENT } from './constants/redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: LIVE_REDIS_CLIENT,
      useFactory: (): Redis =>
        new Redis(AppConfig.get().REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
        }),
    },
  ],
  exports: [LIVE_REDIS_CLIENT],
})
export class RedisModule {}
