import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  CHANNEL_INBOX_KEY_PREFIX,
  CHANNEL_INBOX_MAX_MESSAGES,
  CHANNEL_INBOX_TTL_SECONDS,
} from '../constants/channel.constants';
import { ChannelInboxStore } from './channel-inbox.store';
import type { ChannelMessage } from '../types/channel.types';

/**
 * Redis-backed inbox: one bounded list per owner, expiring after a week.
 *
 * A store, not a table, on purpose: an inbound alert is a notification with a
 * short useful life, and a bounded list with a TTL cannot grow without limit
 * no matter how chatty a sender is.
 */
@Injectable()
export class ChannelInboxRepository extends ChannelInboxStore {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async append(userId: string, message: ChannelMessage): Promise<void> {
    const key = this.key(userId);
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.ltrim(key, -CHANNEL_INBOX_MAX_MESSAGES, -1);
    await this.redis.expire(key, CHANNEL_INBOX_TTL_SECONDS);
  }

  async listRaw(userId: string): Promise<string[]> {
    return this.redis.lrange(this.key(userId), 0, -1);
  }

  async removeRaw(userId: string, raw: string): Promise<boolean> {
    const removed = await this.redis.lrem(this.key(userId), 1, raw);
    return removed > 0;
  }

  private key(userId: string): string {
    return `${CHANNEL_INBOX_KEY_PREFIX}${userId}`;
  }
}
