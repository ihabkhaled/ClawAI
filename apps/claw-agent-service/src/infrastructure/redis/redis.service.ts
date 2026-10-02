import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './constants/redis.constants';
import { REDIS_FIXED_WINDOW_SCRIPT } from './constants/redis-window.constants';
import type { FixedWindowHit } from './types/redis-window.types';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await (ttlSeconds !== undefined
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value));
  }

  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Count one hit on a fixed window of `ttlSeconds` and report what is left.
   *
   * One Lua call, so a counter can never be left without an expiry (the old
   * INCR-then-EXPIRE pair could). A malformed reply is reported as the first
   * hit of a fresh window rather than a refusal: this backs rate limits that
   * fail open by design (rules/58).
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<FixedWindowHit> {
    const reply: unknown = await this.client.eval(
      REDIS_FIXED_WINDOW_SCRIPT,
      1,
      key,
      String(ttlSeconds),
    );
    if (Array.isArray(reply)) {
      const values: unknown[] = reply;
      const [count, ttl] = values;
      if (typeof count === 'number' && typeof ttl === 'number') {
        return { count, ttlSeconds: ttl > 0 ? ttl : ttlSeconds };
      }
    }
    return { count: 1, ttlSeconds };
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
