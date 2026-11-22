import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import {
  LIVE_CAPTURE_QUEUE_MAX,
  LIVE_CAPTURE_QUEUE_TTL_SECONDS,
} from '../../processing/constants/processing.constants';
import type { AudioChunk } from '../../processing/types/processing.types';
import {
  captureQueueKey,
  encodeCaptureChunk,
} from '../../processing/utilities/capture-chunk.utility';
import {
  LIVE_CAPTURE_MIN_INTERVAL_MS,
  LIVE_CAPTURE_RATE_KEY_PREFIX,
} from '../constants/live-capture.constants';

/** Redis side of browser capture: the per-session chunk rate slot and the run's chunk queue. */
@Injectable()
export class LiveCaptureManager {
  constructor(@Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis) {}

  /** True when at least 3 s passed since this session's previous slot (SET NX PX, atomic). */
  async claimRateSlot(sessionId: string): Promise<boolean> {
    const reply = await this.redis.set(
      `${LIVE_CAPTURE_RATE_KEY_PREFIX}${sessionId}`,
      '1',
      'PX',
      LIVE_CAPTURE_MIN_INTERVAL_MS,
      'NX',
    );
    return reply === 'OK';
  }

  /** RPUSH the chunk, keep only the newest 20, and let an undrained queue expire. */
  async enqueue(runId: string, chunk: AudioChunk): Promise<void> {
    const key = captureQueueKey(runId);
    await this.redis
      .multi()
      .rpush(key, encodeCaptureChunk(chunk))
      .ltrim(key, -LIVE_CAPTURE_QUEUE_MAX, -1)
      .expire(key, LIVE_CAPTURE_QUEUE_TTL_SECONDS)
      .exec();
  }
}
