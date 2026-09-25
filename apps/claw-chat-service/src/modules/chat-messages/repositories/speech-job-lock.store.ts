import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  SPEECH_JOB_LOCK_ACQUIRE_SCRIPT,
  SPEECH_JOB_LOCK_KEY_PREFIX,
  SPEECH_JOB_LOCK_RELEASE_SCRIPT,
  SPEECH_JOB_LOCK_TTL_MS,
} from '../constants/speech.constants';

/**
 * One progressive "Read aloud" job per reply across every chat-service
 * replica (prod runs 4). `SET NX PX` in Redis: the replica that gets the key
 * runs the job; a sibling that loses answers the state as it is. The TTL
 * outlives the job's own deadline, so a replica that dies mid-job frees the
 * reply for a resume instead of locking it forever. Release deletes only a
 * lock this replica still owns (compare-and-delete).
 *
 * THROWS when Redis is unreachable: the caller refuses to start a paid job it
 * cannot prove is the only one.
 */
@Injectable()
export class SpeechJobLockStore {
  constructor(private readonly redis: RedisService) {}

  /** The lock token when this replica now owns the reply's job, else null. */
  async acquire(messageId: string): Promise<string | null> {
    const token = randomUUID();
    const acquired = await this.redis
      .getClient()
      .eval(
        SPEECH_JOB_LOCK_ACQUIRE_SCRIPT,
        1,
        this.key(messageId),
        token,
        String(SPEECH_JOB_LOCK_TTL_MS),
      );
    return acquired === 1 ? token : null;
  }

  async release(messageId: string, token: string): Promise<void> {
    await this.redis
      .getClient()
      .eval(SPEECH_JOB_LOCK_RELEASE_SCRIPT, 1, this.key(messageId), token);
  }

  private key(messageId: string): string {
    return `${SPEECH_JOB_LOCK_KEY_PREFIX}${messageId}`;
  }
}
