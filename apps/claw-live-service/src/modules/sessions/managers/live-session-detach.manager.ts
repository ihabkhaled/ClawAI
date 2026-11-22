import { Inject, Injectable, Logger } from '@nestjs/common';

import { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { LiveSessionState, type LiveViewerSession } from '../../../generated/prisma';
import { BillingService } from '../../billing/services/billing.service';
import { RunCoordinatorService } from '../../processing/services/run-coordinator.service';
import { LIVE_EVENT_PUBLISHER } from '../../realtime/constants/realtime.tokens';
import type { LiveEventPublisher } from '../../realtime/types/live-stream-event.types';
import { LIVE_SETTLE_ON_CLOSE_STATES } from '../constants/live-session.constants';
import { LiveSessionRepository } from '../repositories/live-session.repository';
import { LivePresenceManager } from './live-presence.manager';

/**
 * Detaches a viewer: explicit close, sendBeacon close, the reaper, or a mode
 * change leaving its old run. Settles the partial block (only full delivered
 * seconds, prorated per second), removes presence and tells the coordinator so
 * the run stops when its last viewer leaves. Idempotent across replicas.
 */
@Injectable()
export class LiveSessionDetachManager {
  private readonly logger = new Logger(LiveSessionDetachManager.name);

  constructor(
    private readonly sessions: LiveSessionRepository,
    private readonly presence: LivePresenceManager,
    private readonly billing: BillingService,
    private readonly coordinator: RunCoordinatorService,
    @Inject(LIVE_EVENT_PUBLISHER) private readonly publisher: LiveEventPublisher,
  ) {}

  /** Settles what the session still owes on its current run (used by close and by a run switch). */
  async settleRemainder(sessionId: string): Promise<LiveViewerSession | null> {
    const fresh = await this.sessions.findById(sessionId);
    if (!fresh?.runId || fresh.pendingSeconds <= 0) return fresh;
    if (!LIVE_SETTLE_ON_CLOSE_STATES.includes(fresh.state)) return fresh;
    await this.billing.settleBlock(fresh, fresh.pendingSeconds, { final: true });
    return this.sessions.findById(sessionId);
  }

  /** Closes the session; true when this call did the detach. */
  async detach(session: LiveViewerSession, reason: string): Promise<boolean> {
    if (session.state === LiveSessionState.DETACHED) return false;
    await this.settleRemainder(session.id);
    const won = await this.sessions.markDetached(session.id, new Date());
    if (!won || session.runId === null) return won;
    await this.presence.remove(session.runId, session.id);
    await this.leaveRun(session.runId);
    await this.publisher.publish({
      type: LiveStreamEventType.STATUS,
      runId: session.runId,
      startAt: Date.now(),
      status: LiveStatusCode.COMPLETED,
      data: { sessionId: session.id, sessionState: LiveSessionState.DETACHED, reason },
    });
    return true;
  }

  /** Tells the coordinator a viewer left; a failure is logged, the reaper is not blocked by it. */
  async leaveRun(runId: string): Promise<void> {
    try {
      await this.coordinator.onViewerDetached(runId);
    } catch (error: unknown) {
      this.logger.warn(
        `onViewerDetached failed runId=${runId} error=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
