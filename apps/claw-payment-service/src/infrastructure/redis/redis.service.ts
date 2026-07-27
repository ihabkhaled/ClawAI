import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './constants/redis.constants';
import { REDIS_RELEASE_LOCK_SCRIPT } from './constants/redis-lock.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    this.logger.debug('get: reading key');
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.logger.debug(`set: writing key ttl=${String(ttlSeconds ?? 'none')}`);
    await (ttlSeconds === undefined
      ? this.client.set(key, value)
      : this.client.set(key, value, 'EX', ttlSeconds));
  }

  async acquireLock(key: string, ownerToken: string, ttlSeconds: number): Promise<boolean> {
    this.logger.debug(`acquireLock: ttl=${String(ttlSeconds)}`);
    const result = await this.client.set(key, ownerToken, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, ownerToken: string): Promise<boolean> {
    this.logger.debug('releaseLock: comparing owner token');
    const result = await this.client.eval(REDIS_RELEASE_LOCK_SCRIPT, 1, key, ownerToken);
    return result === 1;
  }

  getClient(): Redis {
    this.logger.debug('getClient: returning Redis adapter');
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('onModuleDestroy: closing Redis connection');
    await this.client.quit();
  }
}
