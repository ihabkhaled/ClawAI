import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  PRESENCE_TOUCH_INTERVAL_SECONDS,
  PRESENCE_TOUCH_KEY_PREFIX,
} from '../../users/constants/user-admin.constants';
import { UsersRepository } from '../../users/repositories/users.repository';

/**
 * "Last seen", cheaply (ADR-200). At most one write per user per 60 s: a Redis
 * `SET NX EX 60` claim decides, and the SQL itself also refuses to move
 * lastSeenAt unless it is older than 60 s, so Redis being down degrades to a
 * guarded indexed UPDATE rather than to a write per heartbeat. Never throws:
 * presence must not break a login, a refresh or a heartbeat.
 */
@Injectable()
export class UserPresenceService {
  private readonly logger = new Logger(UserPresenceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly usersRepository: UsersRepository,
  ) {}

  /** Returns true when lastSeenAt was written, false when throttled or on failure. */
  async touch(userId: string, now: Date = new Date()): Promise<boolean> {
    try {
      const claimed = await this.redis
        .getClient()
        .set(
          `${PRESENCE_TOUCH_KEY_PREFIX}${userId}`,
          '1',
          'EX',
          PRESENCE_TOUCH_INTERVAL_SECONDS,
          'NX',
        );
      if (claimed !== 'OK') return false;
    } catch {
      // Redis unavailable: fall through to the SQL-guarded write.
    }
    try {
      const staleBefore = new Date(now.getTime() - PRESENCE_TOUCH_INTERVAL_SECONDS * 1000);
      return (await this.usersRepository.touchLastSeen(userId, now, staleBefore)) > 0;
    } catch (error: unknown) {
      this.logger.warn(
        `presence touch failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }
}
