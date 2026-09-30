import { Inject, Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  ZERO_RETENTION_MARKER_TTL_SECONDS,
  ZERO_RETENTION_RUN_KEY_PREFIX,
  ZERO_RETENTION_TURN_KEY_PREFIX,
} from '../constants/zero-retention.constants';
import type { ZeroRetentionRedisPort } from '../types/zero-retention.types';

/**
 * Remembers which turns asked for zero data retention.
 *
 * The request that carries the header returns before the turn ends — a chat
 * turn is answered on whichever replica consumes `message.routed`, and a
 * Runtime V2 run ends on a later request — so the flag has to outlive the
 * request that set it. Kept in Redis, like the run state itself, so every
 * replica sees it. The value is a constant: nothing about the content is stored.
 */
@Injectable()
export class ZeroRetentionMarkerStore {
  constructor(@Inject(RedisService) private readonly redis: ZeroRetentionRedisPort) {}

  markTurn(userMessageId: string): Promise<void> {
    return this.redis.set(
      `${ZERO_RETENTION_TURN_KEY_PREFIX}${userMessageId}`,
      '1',
      ZERO_RETENTION_MARKER_TTL_SECONDS,
    );
  }

  markRun(runId: string): Promise<void> {
    return this.redis.set(
      `${ZERO_RETENTION_RUN_KEY_PREFIX}${runId}`,
      '1',
      ZERO_RETENTION_MARKER_TTL_SECONDS,
    );
  }

  async isTurnMarked(userMessageId: string): Promise<boolean> {
    return (await this.redis.get(`${ZERO_RETENTION_TURN_KEY_PREFIX}${userMessageId}`)) !== null;
  }

  async isRunMarked(runId: string): Promise<boolean> {
    return (await this.redis.get(`${ZERO_RETENTION_RUN_KEY_PREFIX}${runId}`)) !== null;
  }
}
