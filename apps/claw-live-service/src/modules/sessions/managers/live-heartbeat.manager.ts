import { Injectable } from '@nestjs/common';

import { LiveHeartbeatState } from '../../../common/enums/live-heartbeat-state.enum';
import { LiveSettleOutcome } from '../../../common/enums/live-settle-outcome.enum';
import { LiveSessionState, type LiveViewerSession } from '../../../generated/prisma';
import { LIVE_BLOCK_SECONDS } from '../../billing/constants/live-billing.constants';
import { BillingService } from '../../billing/services/billing.service';
import {
  LIVE_ACCRUING_STATES,
  LIVE_MAX_BLOCKS_PER_HEARTBEAT,
} from '../constants/live-session.constants';
import type { HeartbeatBody } from '../dto/live-session.dto';
import { LiveSessionRepository } from '../repositories/live-session.repository';
import type { LiveHeartbeatView, LiveRunAccrualView } from '../types/live-session.types';
import { isRunAccruing, nextStateForBeat, statusCodeFor } from '../utilities/live-accrual.utility';
import { LiveCoverageManager } from './live-coverage.manager';
import { LivePresenceManager } from './live-presence.manager';
import { LiveSessionPresenterManager } from './live-session-presenter.manager';

/**
 * One heartbeat (architecture doc sections 3, 5, 6): presence, play/pause
 * state, server-side accrual (never trusted from the client), coverage and
 * 60-second block settlement.
 */
@Injectable()
export class LiveHeartbeatManager {
  constructor(
    private readonly sessions: LiveSessionRepository,
    private readonly presence: LivePresenceManager,
    private readonly coverage: LiveCoverageManager,
    private readonly billing: BillingService,
    private readonly presenter: LiveSessionPresenterManager,
  ) {}

  async beat(session: LiveViewerSession, body: HeartbeatBody): Promise<LiveHeartbeatView> {
    const now = Date.now();
    const terminal: LiveSessionState[] = [LiveSessionState.DETACHED, LiveSessionState.UNSUPPORTED];
    if (terminal.includes(session.state) || session.runId === null) {
      return this.view(session, null);
    }
    await this.presence.touch(session.runId, session.id, now);
    const run = await this.sessions.findRun(session.runId);
    const state = nextStateForBeat(session.state, body.state);
    const accruing =
      body.state === LiveHeartbeatState.PLAYING &&
      LIVE_ACCRUING_STATES.includes(state) &&
      isRunAccruing(run, now);
    const seconds = accruing
      ? await this.presence.accrue(
          session.userId,
          session.runId,
          session.lastHeartbeatAt?.getTime() ?? null,
          now,
        )
      : 0;
    const applied = await this.sessions.recordHeartbeat(session.id, {
      expectedState: session.state,
      state,
      lastHeartbeatAt: new Date(now),
      lastPlaybackAt: BigInt(body.playbackAt),
      pendingIncrement: seconds,
    });
    if (!applied) {
      // The state moved under us (billing, another device, close): liveness only.
      await this.sessions.touch(session.id, new Date(now), BigInt(body.playbackAt));
    } else if (accruing) {
      await this.coverage.record(session, body, now);
    }
    const settled = await this.settleFullBlocks(session.id);
    return this.view(settled ?? session, run);
  }

  /** Settles every full 60 s block pending (bounded), then expires a due grace window. */
  private async settleFullBlocks(sessionId: string): Promise<LiveViewerSession | null> {
    let current = await this.sessions.findById(sessionId);
    for (let block = 0; block < LIVE_MAX_BLOCKS_PER_HEARTBEAT; block += 1) {
      if (!current || current.pendingSeconds < LIVE_BLOCK_SECONDS) break;
      if (!LIVE_ACCRUING_STATES.includes(current.state)) break;
      const result = await this.billing.settleBlock(current, LIVE_BLOCK_SECONDS);
      current = await this.sessions.findById(sessionId);
      if (
        result.outcome === LiveSettleOutcome.DEFERRED ||
        result.outcome === LiveSettleOutcome.SKIPPED
      ) {
        break;
      }
    }
    if (current?.state === LiveSessionState.GRACE) {
      const state = await this.billing.expireGraceIfDue(current);
      if (state !== current.state) current = { ...current, state };
    }
    return current;
  }

  private async view(
    session: LiveViewerSession,
    run: LiveRunAccrualView | null,
  ): Promise<LiveHeartbeatView> {
    return {
      state: session.state,
      statusCode: statusCodeFor(session.state, run),
      usage: await this.presenter.usage(session),
    };
  }
}
