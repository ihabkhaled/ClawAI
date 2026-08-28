import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  CHAT_STREAM_SUBSCRIBER_CLIENT,
  REDIS_CLIENT,
} from '../../../infrastructure/redis/constants/redis.constants';
import type {
  RedisClientPort,
  RedisSubscriberPort,
} from '../../../infrastructure/redis/types/redis-client.types';
import {
  CHAT_STREAM_CHANNEL,
  CHAT_STREAM_KEY_TTL_SECONDS,
  CHAT_STREAM_PUBLISH_SCRIPT,
  CHAT_STREAM_REPLAY_KEY_PREFIX,
  CHAT_STREAM_REPLAY_LIMIT,
  CHAT_STREAM_SEQUENCE_KEY_PREFIX,
  CHAT_STREAM_THREAD_ID_PATTERN,
} from '../constants/chat-stream-bus.constants';
import type { StreamEvent } from '../types/stream.types';
import { describeStreamError, parseStreamFrame } from '../utilities/chat-stream-frame.utility';

/**
 * Carries chat stream frames between replicas.
 *
 * RabbitMQ hands a routed message to exactly one replica, but the browser's SSE
 * connection is pinned to whichever replica nginx routed it to. Those are the
 * same instance only by coincidence, so with four replicas an answer streamed
 * into a process-local bus reaches its reader roughly one time in four. This
 * service is what makes the two independent of each other.
 *
 * Publishing goes through Lua so the sequence, the replay record and the fan-out
 * are one atomic step. If they were three round-trips a client could be handed a
 * replay that was missing the frame it had just been shown live.
 */
@Injectable()
export class ChatStreamBusService implements OnModuleInit {
  private readonly logger = new Logger(ChatStreamBusService.name);
  private handler: ((event: StreamEvent) => void) | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientPort,
    @Inject(CHAT_STREAM_SUBSCRIBER_CLIENT) private readonly subscriber: RedisSubscriberPort,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber.onMessage((channel, payload) => {
      if (channel !== CHAT_STREAM_CHANNEL) {
        return;
      }
      this.deliver(payload);
    });
    // Re-assert on every reconnection. ioredis restores the connection silently
    // but not the subscription, and a replica that is connected-but-unsubscribed
    // serves SSE streams that never emit again.
    this.subscriber.onReady(() => {
      void this.subscribe();
    });
    await this.subscribe();
  }

  /** Registers the single consumer of inbound frames (the stream service). */
  onEvent(handler: (event: StreamEvent) => void): void {
    this.handler = handler;
  }

  /**
   * Fans one frame out to every replica.
   *
   * Fire-and-forget by design: `emit` is called from ~30 synchronous call sites
   * across every orchestration mode, and making it awaitable would put a Redis
   * round-trip in front of each one. Ordering still holds — ioredis writes
   * commands to one connection in call order and Redis executes them in arrival
   * order, so frames are sequenced in the order `emit` ran, not the order their
   * promises settle.
   */
  publish(event: StreamEvent): void {
    if (!CHAT_STREAM_THREAD_ID_PATTERN.test(event.threadId)) {
      // The id is concatenated into a JSON string inside Lua. Refusing here is
      // better than emitting a frame that every client on the thread fails to
      // parse.
      this.logger.error(`publish: refusing frame for malformed threadId`);
      return;
    }

    const serialized = JSON.stringify(event);
    void this.redis
      .eval(
        CHAT_STREAM_PUBLISH_SCRIPT,
        2,
        `${CHAT_STREAM_SEQUENCE_KEY_PREFIX}${event.threadId}`,
        `${CHAT_STREAM_REPLAY_KEY_PREFIX}${event.threadId}`,
        CHAT_STREAM_CHANNEL,
        serialized,
        event.threadId,
        String(CHAT_STREAM_REPLAY_LIMIT),
        String(CHAT_STREAM_KEY_TTL_SECONDS),
      )
      .catch((error: unknown) => {
        // Redis is unreachable. Deliver locally so a single-replica install
        // degrades to exactly its previous behaviour rather than going silent,
        // and accept that other replicas miss this frame — the answer itself is
        // still written to the database and the client's poll will find it.
        this.logger.error(
          `publish: Redis fan-out failed, delivering locally only — ${describeStreamError(error)}`,
        );
        this.handler?.(event);
      });
  }

  /**
   * The frames a newly attached client missed.
   *
   * Returns an empty list on any failure. A replay is a convenience; refusing to
   * open the stream because the buffer could not be read would turn a degraded
   * reconnect into no reconnect at all.
   */
  async replay(threadId: string): Promise<StreamEvent[]> {
    try {
      const raw = await this.redis.lrange(`${CHAT_STREAM_REPLAY_KEY_PREFIX}${threadId}`, 0, -1);
      return raw.flatMap((entry) => {
        const parsed = parseStreamFrame(entry);
        return parsed === null ? [] : [parsed];
      });
    } catch (error: unknown) {
      this.logger.error(
        `replay: could not read buffer for ${threadId} — ${describeStreamError(error)}`,
      );
      return [];
    }
  }

  /**
   * Drops a thread's replay buffer at the start of a run.
   *
   * The sequence counter is deliberately left alone. Resetting it would restart
   * numbering at 1, and the browser discards a progress stage whose sequence is
   * below one it has already rendered — the new run's frames would arrive and be
   * thrown away silently.
   */
  async resetReplay(threadId: string): Promise<void> {
    try {
      await this.redis.del(`${CHAT_STREAM_REPLAY_KEY_PREFIX}${threadId}`);
    } catch (error: unknown) {
      // A surviving buffer replays the previous run's terminal DONE to the next
      // client, which reads it as instant completion.
      this.logger.error(
        `resetReplay: could not clear buffer for ${threadId} — ${describeStreamError(error)}`,
      );
    }
  }

  private async subscribe(): Promise<void> {
    try {
      await this.subscriber.subscribe(CHAT_STREAM_CHANNEL);
      this.logger.log(`subscribed to ${CHAT_STREAM_CHANNEL}`);
    } catch (error: unknown) {
      this.logger.error(`subscribe: failed — ${describeStreamError(error)}`);
    }
  }

  private deliver(payload: string): void {
    const event = parseStreamFrame(payload);
    if (event === null) {
      this.logger.warn('deliver: dropped an unparsable frame');
      return;
    }
    this.handler?.(event);
  }
}
