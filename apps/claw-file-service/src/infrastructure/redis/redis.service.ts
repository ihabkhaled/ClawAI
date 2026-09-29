import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_COMPARE_AND_DELETE_SCRIPT } from './constants/redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await (ttlSeconds
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value));
  }

  /**
   * SET key value EX ttl NX — true when this caller took the key, false when
   * someone already holds it. The video job uses it as a per-file lock.
   */
  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Compare-and-delete in one Lua call: removes `key` only while it still holds
   * `expected`, so a lock another job took a moment ago is never deleted.
   * True when this call deleted it.
   */
  async deleteIfValue(key: string, expected: string): Promise<boolean> {
    const deleted = await this.client.eval(REDIS_COMPARE_AND_DELETE_SCRIPT, 1, key, expected);
    return deleted === 1;
  }

  /** INCR with an expiry set on every call; returns the new count. */
  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    await this.client.expire(key, ttlSeconds);
    return count;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
