import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  REMOTE_TRIGGER_IDEMPOTENCY_TTL_SECONDS,
  REMOTE_TRIGGER_PENDING_MARKER,
  REMOTE_TRIGGER_PENDING_TTL_SECONDS,
} from '../constants/remote-trigger.constants';
import { RemoteTriggerIdempotencyStore } from '../services/remote-trigger.ports';

/** Idempotency keys in Redis: SET NX to claim, a day's TTL once settled. */
@Injectable()
export class RemoteTriggerIdempotencyRepository extends RemoteTriggerIdempotencyStore {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async claim(key: string): Promise<boolean> {
    return this.redis.setNxEx(
      key,
      REMOTE_TRIGGER_PENDING_MARKER,
      REMOTE_TRIGGER_PENDING_TTL_SECONDS,
    );
  }

  async read(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async settle(key: string, commandId: string): Promise<void> {
    await this.redis.set(key, commandId, REMOTE_TRIGGER_IDEMPOTENCY_TTL_SECONDS);
  }

  async release(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
