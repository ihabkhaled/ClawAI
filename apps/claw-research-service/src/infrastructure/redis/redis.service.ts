import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './constants/redis.constants';

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

  /**
   * Fire-and-forget by design: a progress tick that never arrives costs
   * nothing — the next tick or the final result supersedes it. Publishing
   * does not put this connection into subscribe-only mode (unlike
   * `SUBSCRIBE`), so it is safe to share with every other command this
   * service already issues on it.
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  /**
   * GET / SET EX / DEL bounded by `timeoutMs`. The client is built with
   * `maxRetriesPerRequest: null`, so while Redis is down a command waits in the
   * offline queue forever; a caller on a request path must not. These reject
   * on timeout or error; the caller treats that as a miss.
   */
  async getBounded(key: string, timeoutMs: number): Promise<string | null> {
    return this.bounded(this.client.get(key), timeoutMs);
  }

  async setBounded(
    key: string,
    value: string,
    ttlSeconds: number,
    timeoutMs: number,
  ): Promise<void> {
    await this.bounded(this.client.set(key, value, 'EX', ttlSeconds), timeoutMs);
  }

  async delBounded(key: string, timeoutMs: number): Promise<void> {
    await this.bounded(this.client.del(key), timeoutMs);
  }

  private async bounded<T>(command: Promise<T>, timeoutMs: number): Promise<T> {
    command.catch(() => {});
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        command,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Redis command timed out after ${String(timeoutMs)}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
