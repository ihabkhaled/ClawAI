import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type Redis from 'ioredis';

import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { LiveSessionState } from '../../../generated/prisma';
import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import { REPLAY_KEY_PREFIX } from '../constants/deletion.constants';
import { DeletionRepository } from '../repositories/deletion.repository';
import { userDeletedEventSchema } from '../schemas/user-deleted-event.schema';
import type { DeletionResult, DeletionScope, DeletionSummary } from '../types/deletion.types';

@Injectable()
export class DeletionService {
  private readonly logger = new Logger(DeletionService.name);

  constructor(
    private readonly repository: DeletionRepository,
    @Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** `DELETE /history`: every detached session; sessions still attached are skipped and counted. */
  async deleteAllHistory(userId: string): Promise<DeletionSummary> {
    return this.run({ userId, includeActive: false, purgeBillingState: false });
  }

  /** `DELETE /history/:sessionId`: 404 for a stranger's id, 409 while a viewer is still attached. */
  async deleteSession(userId: string, sessionId: string): Promise<DeletionSummary> {
    const session = await this.repository.findOwnedSession(userId, sessionId);
    if (session === null) throw new NotFoundException(LiveHistoryErrorCode.SESSION_NOT_FOUND);
    if (session.state !== LiveSessionState.DETACHED) {
      throw new ConflictException(LiveHistoryErrorCode.SESSION_ACTIVE);
    }
    const summary = await this.run({
      userId,
      sessionId,
      includeActive: false,
      purgeBillingState: false,
    });
    // The session became active between the check and the delete: nothing was removed.
    if (summary.sessionsDeleted === 0) {
      throw new ConflictException(LiveHistoryErrorCode.SESSION_ACTIVE);
    }
    return summary;
  }

  /**
   * `user.deleted`: the same path for every session, attached or not, plus the billing grace state.
   * Usage months, charges and provider costs are financial records and stay. Running it again finds
   * nothing, so a redelivered event is harmless. The log carries the event id, never the account id.
   */
  async handleUserDeleted(rawEvent: unknown): Promise<void> {
    const parsed = userDeletedEventSchema.safeParse(rawEvent);
    if (!parsed.success) throw new Error('Invalid user deletion event');
    const summary = await this.run({
      userId: parsed.data.userId,
      includeActive: true,
      purgeBillingState: true,
    });
    this.logger.log(
      `handleUserDeleted: event=${parsed.data.eventId} sessions=${String(summary.sessionsDeleted)} runs=${String(summary.runsDeleted)}`,
    );
  }

  /** Orphan sweep (see ORPHAN_SWEEP_INTERVAL_MS). Returns how many runs were tombstoned. */
  async sweepOrphanRuns(limit: number): Promise<number> {
    const tombstonedRunIds = await this.repository.sweepOrphanRuns(limit);
    await this.clearReplayBuffers({ sessionsDeleted: 0, skippedActive: 0, tombstonedRunIds });
    return tombstonedRunIds.length;
  }

  private async run(scope: DeletionScope): Promise<DeletionSummary> {
    const result = await this.repository.deleteForScope(scope);
    await this.clearReplayBuffers(result);
    return {
      sessionsDeleted: result.sessionsDeleted,
      skippedActive: result.skippedActive,
      runsDeleted: result.tombstonedRunIds.length,
    };
  }

  /** After commit. A failure here only leaves a buffer that expires on its own, so it is logged, not thrown. */
  private async clearReplayBuffers(result: DeletionResult): Promise<void> {
    if (result.tombstonedRunIds.length === 0) return;
    try {
      await this.redis.del(
        ...result.tombstonedRunIds.map((runId) => `${REPLAY_KEY_PREFIX}${runId}`),
      );
    } catch {
      this.logger.warn('clearReplayBuffers: could not delete replay buffers');
    }
  }
}
