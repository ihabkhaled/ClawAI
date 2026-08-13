import type { RuntimeV2RedisOperation } from '../enums/runtime-v2-redis-operation.enum';

export interface RedisClientPort {
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  eval(script: string, numberOfKeys: number, ...values: string[]): Promise<unknown>;
  evalRuntimeV2(
    script: string,
    numberOfKeys: number,
    values: readonly string[],
    deadlineMs: number,
  ): Promise<unknown>;
  disconnect(reconnect: boolean): void;
  quit(): Promise<string>;
}

export interface RuntimeV2RedisCommand {
  readonly operation: RuntimeV2RedisOperation;
  readonly keys: readonly string[];
  readonly arguments: readonly string[];
}

export interface RuntimeV2RedisPort {
  executeRuntimeV2(command: RuntimeV2RedisCommand): Promise<unknown>;
}
