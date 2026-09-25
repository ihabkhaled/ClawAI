import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  SPEECH_JOB_CANCEL_FLAG_VALUE,
  SPEECH_JOB_CANCEL_KEY_PREFIX,
  SPEECH_JOB_CANCEL_TTL_SECONDS,
} from '../constants/speech.constants';

/**
 * The owner's "stop reading" flag for one reply's progressive "Read aloud"
 * job, visible to every chat-service replica (prod runs 4): the cancel request
 * lands on any replica, the job runs on one. Keyed per message AND
 * generation, so a later POST's new job never inherits an old cancel. The TTL
 * matches the job lock's, so the flag outlives every job that could read it.
 *
 * `request` THROWS when Redis is unreachable — the caller answers 503 rather
 * than claim a stop it could not deliver. `isRequested` also throws; the job's
 * watcher treats a failed read as "not cancelled" and reads again next tick.
 */
@Injectable()
export class SpeechJobCancelStore {
  constructor(private readonly redis: RedisService) {}

  async request(messageId: string, generation: number): Promise<void> {
    await this.redis.set(
      this.key(messageId, generation),
      SPEECH_JOB_CANCEL_FLAG_VALUE,
      SPEECH_JOB_CANCEL_TTL_SECONDS,
    );
  }

  async isRequested(messageId: string, generation: number): Promise<boolean> {
    const value = await this.redis.get(this.key(messageId, generation));
    return value !== null;
  }

  private key(messageId: string, generation: number): string {
    return `${SPEECH_JOB_CANCEL_KEY_PREFIX}${messageId}:${String(generation)}`;
  }
}
