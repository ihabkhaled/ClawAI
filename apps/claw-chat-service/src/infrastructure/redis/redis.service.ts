import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { AppConfig } from '../../app/config/app.config';
import { REDIS_CLIENT, RUNTIME_V2_REDIS_CLIENT } from './constants/redis.constants';
import { RUNTIME_V2_REDIS_SCRIPTS } from './constants/runtime-v2-redis-scripts.constants';
import type {
  RedisClientPort,
  RuntimeV2RedisCommand,
  RuntimeV2RedisPort,
} from './types/redis-client.types';

@Injectable()
export class RedisService implements OnModuleDestroy, RuntimeV2RedisPort {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: RedisClientPort,
    @Optional()
    @Inject(RUNTIME_V2_REDIS_CLIENT)
    private readonly runtimeV2Client?: RedisClientPort,
  ) {}

  getClient(): RedisClientPort {
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

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async executeRuntimeV2(command: RuntimeV2RedisCommand): Promise<unknown> {
    return (this.runtimeV2Client ?? this.client).evalRuntimeV2(
      RUNTIME_V2_REDIS_SCRIPTS[command.operation],
      command.keys.length,
      [...command.keys, ...command.arguments],
      AppConfig.runtimeV2RedisDeadlineMs(),
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.runtimeV2Client !== undefined && this.runtimeV2Client !== this.client)
      await this.runtimeV2Client.quit();
    await this.client.quit();
  }
}
