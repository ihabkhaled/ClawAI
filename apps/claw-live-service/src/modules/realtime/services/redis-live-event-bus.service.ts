import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';

import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import {
  LIVE_EVENT_MAX_BYTES,
  LIVE_EVENT_PUBLISH_SCRIPT,
  LIVE_REPLAY_KEY_PREFIX,
  LIVE_REPLAY_LIMIT,
  LIVE_REPLAY_TTL_SECONDS,
  LIVE_RUN_CHANNEL_PREFIX,
  LIVE_RUN_ID_PATTERN,
  LIVE_SEQUENCE_KEY_PREFIX,
} from '../constants/live-event-bus.constants';
import type {
  LiveEventEnvelope,
  LiveEventListener,
  LiveEventUnsubscribe,
} from '../types/live-event-bus.types';
import type { LiveEventPublisher, LiveStreamEvent } from '../types/live-stream-event.types';
import { describeError } from '../utilities/live-error.utility';
import { parseEnvelope } from '../utilities/live-event-filter.utility';

/**
 * Redis transport for run events: an atomic Lua publish (id, replay list,
 * PUBLISH) and ONE shared subscriber connection per replica that fans each
 * frame out to the in-process listeners of its run.
 */
@Injectable()
export class RedisLiveEventBus implements LiveEventPublisher, OnModuleDestroy {
  private readonly logger = new Logger(RedisLiveEventBus.name);
  private readonly listeners = new Map<string, Set<LiveEventListener>>();
  private subscriber: Redis | undefined;

  constructor(@Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(event: LiveStreamEvent): Promise<void> {
    if (!LIVE_RUN_ID_PATTERN.test(event.runId)) {
      this.logger.warn(`publish: dropped event with invalid run id type=${event.type}`);
      return;
    }
    const json = JSON.stringify(event);
    const bytes = Buffer.byteLength(json, 'utf8');
    if (bytes > LIVE_EVENT_MAX_BYTES) {
      this.logger.warn(
        `publish: dropped oversized event runId=${event.runId} type=${event.type} bytes=${String(bytes)}`,
      );
      return;
    }
    try {
      await this.redis.eval(
        LIVE_EVENT_PUBLISH_SCRIPT,
        2,
        `${LIVE_SEQUENCE_KEY_PREFIX}${event.runId}`,
        `${LIVE_REPLAY_KEY_PREFIX}${event.runId}`,
        `${LIVE_RUN_CHANNEL_PREFIX}${event.runId}`,
        json,
        event.runId,
        LIVE_REPLAY_LIMIT,
        LIVE_REPLAY_TTL_SECONDS,
      );
    } catch (error: unknown) {
      // A fan-out failure must never fail the caller (a worker commit or a billing settle).
      this.logger.warn(
        `publish: redis failed runId=${event.runId} type=${event.type} error=${describeError(error)}`,
      );
    }
  }

  /** The run's buffered frames with seq greater than `afterSeq`, oldest first. */
  async replay(runId: string, afterSeq: number): Promise<LiveEventEnvelope[]> {
    const raw = await this.redis.lrange(`${LIVE_REPLAY_KEY_PREFIX}${runId}`, 0, -1);
    return raw
      .map((frame) => parseEnvelope(frame))
      .filter((frame): frame is LiveEventEnvelope => frame !== null && frame.seq > afterSeq);
  }

  /** Clears a run's replay buffer and sequence (history deletion). */
  async clearReplay(runId: string): Promise<void> {
    await this.redis.del(
      `${LIVE_REPLAY_KEY_PREFIX}${runId}`,
      `${LIVE_SEQUENCE_KEY_PREFIX}${runId}`,
    );
  }

  async subscribe(runId: string, listener: LiveEventListener): Promise<LiveEventUnsubscribe> {
    let set = this.listeners.get(runId);
    if (!set) {
      set = new Set();
      this.listeners.set(runId, set);
      await this.ensureSubscriber().subscribe(`${LIVE_RUN_CHANNEL_PREFIX}${runId}`);
    }
    set.add(listener);
    return () => {
      this.removeListener(runId, listener);
    };
  }

  onModuleDestroy(): void {
    this.listeners.clear();
    this.subscriber?.disconnect();
    this.subscriber = undefined;
  }

  private removeListener(runId: string, listener: LiveEventListener): void {
    const set = this.listeners.get(runId);
    if (!set) return;
    set.delete(listener);
    if (set.size > 0) return;
    this.listeners.delete(runId);
    this.subscriber?.unsubscribe(`${LIVE_RUN_CHANNEL_PREFIX}${runId}`).catch((error: unknown) => {
      this.logger.warn(`unsubscribe failed runId=${runId} error=${describeError(error)}`);
    });
  }

  private ensureSubscriber(): Redis {
    if (this.subscriber) return this.subscriber;
    const subscriber = this.redis.duplicate();
    subscriber.on('message', (channel: string, message: string) => {
      this.dispatch(channel, message);
    });
    subscriber.on('error', (error: Error) => {
      this.logger.warn(`subscriber error: ${error.message}`);
    });
    this.subscriber = subscriber;
    return subscriber;
  }

  private dispatch(channel: string, message: string): void {
    if (!channel.startsWith(LIVE_RUN_CHANNEL_PREFIX)) return;
    const set = this.listeners.get(channel.slice(LIVE_RUN_CHANNEL_PREFIX.length));
    if (!set || set.size === 0) return;
    const envelope = parseEnvelope(message);
    if (!envelope) return;
    for (const listener of set) {
      try {
        listener(envelope);
      } catch (error: unknown) {
        this.logger.warn(`listener threw runId=${envelope.runId} error=${describeError(error)}`);
      }
    }
  }
}
