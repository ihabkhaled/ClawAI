import type Redis from 'ioredis';

import { RUNTIME_V2_REDIS_DEADLINE_MS_MAX } from './constants/redis.constants';
import type { RedisClientPort } from './types/redis-client.types';

export class RedisClientAdapter implements RedisClientPort {
  constructor(private readonly client: Redis) {}

  ping(): Promise<string> {
    return this.client.ping();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<string | null> {
    if (mode === 'EX' && ttlSeconds !== undefined)
      return this.client.set(key, value, mode, ttlSeconds);
    return this.client.set(key, value);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  eval(script: string, numberOfKeys: number, ...values: string[]): Promise<unknown> {
    return this.client.eval(script, numberOfKeys, ...values);
  }

  evalRuntimeV2(
    script: string,
    numberOfKeys: number,
    values: readonly string[],
    deadlineMs: number,
  ): Promise<unknown> {
    const boundedDeadlineMs =
      Number.isFinite(deadlineMs) && deadlineMs >= 0
        ? Math.min(deadlineMs, RUNTIME_V2_REDIS_DEADLINE_MS_MAX)
        : RUNTIME_V2_REDIS_DEADLINE_MS_MAX;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.client.disconnect(true);
        reject(new Error('Runtime V2 Redis deadline exceeded'));
      }, boundedDeadlineMs);
      this.client.eval(script, numberOfKeys, ...values).then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.client.disconnect(true);
          reject(error instanceof Error ? error : new Error('Runtime V2 Redis command failed'));
        },
      );
    });
  }

  disconnect(reconnect: boolean): void {
    this.client.disconnect(reconnect);
  }

  quit(): Promise<string> {
    return this.client.quit();
  }
}
