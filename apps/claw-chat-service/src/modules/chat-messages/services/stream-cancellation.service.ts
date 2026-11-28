import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  REDIS_CLIENT,
  STREAM_CANCEL_SUBSCRIBER_CLIENT,
} from '../../../infrastructure/redis/constants/redis.constants';
import type {
  RedisClientPort,
  RedisSubscriberPort,
} from '../../../infrastructure/redis/types/redis-client.types';
import {
  STREAM_CANCEL_ACTIVE_KEY_PREFIX,
  STREAM_CANCEL_ACTIVE_TTL_SECONDS,
  STREAM_CANCEL_CARRY_KEY_PREFIX,
  STREAM_CANCEL_CARRY_TTL_SECONDS,
  STREAM_CANCEL_CHANNEL,
  STREAM_RUN_REPLACED_MESSAGE,
} from '../constants/stream-cancellation.constants';
import { describeStreamError } from '../utilities/chat-stream-frame.utility';

/**
 * Registry of in-flight stream runs, reachable from any replica.
 *
 * The AbortController itself cannot leave the process that owns the provider
 * connection, so this keeps the controllers local and moves only the *decision*
 * across replicas: Stop is broadcast, and whichever replica is actually running
 * the model aborts it.
 *
 * Without this, Stop posts to whichever replica nginx picked, finds no
 * controller, and returns quietly — while the model keeps generating and keeps
 * being billed.
 */
@Injectable()
export class StreamCancellationService implements OnModuleInit {
  private readonly logger = new Logger(StreamCancellationService.name);
  private readonly controllers = new Map<string, AbortController>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientPort,
    @Inject(STREAM_CANCEL_SUBSCRIBER_CLIENT) private readonly subscriber: RedisSubscriberPort,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber.onMessage((channel, key) => {
      if (channel !== STREAM_CANCEL_CHANNEL) {
        return;
      }
      // Every replica gets this; only the one holding the run has anything to
      // abort, and the rest no-op.
      this.abortLocal(key);
    });
    this.subscriber.onReady(() => {
      void this.subscribe();
    });
    await this.subscribe();
  }

  /**
   * Claims a run on this replica. Stays synchronous — callers wire the returned
   * signal straight into the provider request.
   */
  register(key: string): AbortController {
    const existing = this.controllers.get(key);
    if (existing !== undefined) {
      existing.abort(new DOMException(STREAM_RUN_REPLACED_MESSAGE, 'AbortError'));
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    void this.markActive(key);
    void this.applyCarriedStop(key, controller);
    this.logger.debug(`register: stream run registered key=${key}`);
    return controller;
  }

  /** True when `signal` was aborted because `register` replaced its run, not by a user Stop. */
  static wasReplaced(signal: AbortSignal): boolean {
    const reason: unknown = signal.reason;
    return reason instanceof DOMException && reason.message === STREAM_RUN_REPLACED_MESSAGE;
  }

  /**
   * Research was stopped by the user: the answer that follows it (on any replica) must start stopped.
   * See STREAM_CANCEL_CARRY_KEY_PREFIX.
   */
  carryStop(key: string): void {
    void this.redis
      .set(`${STREAM_CANCEL_CARRY_KEY_PREFIX}${key}`, '1', 'EX', STREAM_CANCEL_CARRY_TTL_SECONDS)
      .then(() =>
        this.logger.log(`carryStop: the answer after research will start stopped key=${key}`),
      )
      .catch((error: unknown) =>
        this.logger.warn(`carryStop: could not carry Stop — ${describeStreamError(error)}`),
      );
  }

  /** Consumes a carried Stop (DEL is atomic: only one registration takes it) and aborts this run. */
  private async applyCarriedStop(key: string, controller: AbortController): Promise<void> {
    try {
      const carried = (await this.redis.del(`${STREAM_CANCEL_CARRY_KEY_PREFIX}${key}`)) > 0;
      if (!carried) {
        return;
      }
      controller.abort();
      if (this.controllers.get(key) === controller) {
        this.controllers.delete(key);
      }
      this.logger.log(`register: run starts stopped - Stop was pressed during research key=${key}`);
    } catch (error: unknown) {
      this.logger.warn(`register: could not read carried Stop — ${describeStreamError(error)}`);
    }
  }

  /**
   * Stops a run wherever it is running.
   *
   * The `DEL` is the source of truth for the boolean, not the local map: this
   * replica usually does not hold the run. Because `DEL` reports 1 only to the
   * caller that actually removed the key, two concurrent Stops cannot both
   * claim to have stopped the same run.
   */
  async cancel(key: string): Promise<boolean> {
    let wasActive = false;
    try {
      wasActive = (await this.redis.del(`${STREAM_CANCEL_ACTIVE_KEY_PREFIX}${key}`)) > 0;
    } catch (error: unknown) {
      // Fall back to what this replica can see. Worse than the Redis answer,
      // and still better than reporting "nothing to cancel" while aborting.
      wasActive = this.controllers.has(key);
      this.logger.error(`cancel: could not read run state — ${describeStreamError(error)}`);
    }

    // Broadcast regardless of the flag. A run whose marker expired, or was
    // written before this deployment, is still worth aborting if some replica
    // is holding it.
    try {
      await this.redis.eval(
        "redis.call('PUBLISH', KEYS[1], ARGV[1]) return 1",
        1,
        STREAM_CANCEL_CHANNEL,
        key,
      );
    } catch (error: unknown) {
      this.logger.error(`cancel: broadcast failed — ${describeStreamError(error)}`);
      // Single-replica installs must still work when Redis is unreachable.
      this.abortLocal(key);
    }

    this.logger.log(`cancel: requested key=${key} wasActive=${String(wasActive)}`);
    return wasActive;
  }

  release(key: string): void {
    if (this.controllers.delete(key)) {
      this.logger.debug(`release: stream run released key=${key}`);
    }
    void this.redis
      .del(`${STREAM_CANCEL_ACTIVE_KEY_PREFIX}${key}`)
      .catch((error: unknown) =>
        this.logger.warn(`release: could not clear run marker — ${describeStreamError(error)}`),
      );
  }

  /** The live controller of a run this replica holds, so a nested step can listen without replacing it. */
  getController(key: string): AbortController | undefined {
    return this.controllers.get(key);
  }

  /** Whether THIS replica is running it. Not a cluster-wide answer. */
  isActive(key: string): boolean {
    return this.controllers.has(key);
  }

  private abortLocal(key: string): void {
    const controller = this.controllers.get(key);
    if (controller === undefined) {
      return;
    }
    controller.abort();
    this.controllers.delete(key);
    this.logger.log(`abortLocal: aborted stream run key=${key}`);
  }

  private async markActive(key: string): Promise<void> {
    try {
      await this.redis.set(
        `${STREAM_CANCEL_ACTIVE_KEY_PREFIX}${key}`,
        '1',
        'EX',
        STREAM_CANCEL_ACTIVE_TTL_SECONDS,
      );
    } catch (error: unknown) {
      // The run still executes; only the "was anything running" answer degrades.
      this.logger.warn(`register: could not mark run active — ${describeStreamError(error)}`);
    }
  }

  private async subscribe(): Promise<void> {
    try {
      await this.subscriber.subscribe(STREAM_CANCEL_CHANNEL);
      this.logger.log(`subscribed to ${STREAM_CANCEL_CHANNEL}`);
    } catch (error: unknown) {
      this.logger.error(`subscribe: failed — ${describeStreamError(error)}`);
    }
  }
}
