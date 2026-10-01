import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES } from '../../../common/constants/routine-webhook.constants';
import { RoutineWebhookRateStore } from '../services/routine-webhook.ports';

/** The delivery window in Redis: SET NX with the window as its TTL. */
@Injectable()
export class RoutineWebhookRateRepository extends RoutineWebhookRateStore {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async claim(key: string): Promise<boolean> {
    return this.redis.setNxEx(key, '1', ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES);
  }

  async release(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
