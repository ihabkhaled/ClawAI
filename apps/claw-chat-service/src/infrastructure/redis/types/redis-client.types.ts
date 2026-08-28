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
  /** Reads a whole list. Used for the chat replay buffer. */
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

/**
 * A connection dedicated to subscribing.
 *
 * Separate from `RedisClientPort` because Redis puts a subscribed connection
 * into a mode where it accepts almost nothing else — issuing an ordinary
 * command on it fails at runtime. Modelling that as its own port makes the
 * restriction a compile-time fact instead of a comment someone has to read.
 */
export interface RedisSubscriberPort {
  subscribe(channel: string): Promise<void>;
  onMessage(handler: (channel: string, payload: string) => void): void;
  /** Fires on every (re)connection, so callers can re-assert subscriptions. */
  onReady(handler: () => void): void;
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
