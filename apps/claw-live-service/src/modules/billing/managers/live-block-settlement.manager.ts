import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PaygHold } from '@claw/shared-entitlements';

import { LiveCreditRefusal } from '../../../common/enums/live-credit-refusal.enum';
import { LiveSettleOutcome } from '../../../common/enums/live-settle-outcome.enum';
import { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { LiveChargeKind, LiveSessionState } from '../../../generated/prisma';
import { LIVE_EVENT_PUBLISHER } from '../../realtime/constants/realtime.tokens';
import type { LiveEventPublisher } from '../../realtime/types/live-stream-event.types';
import {
  LIVE_METER_FAILURE_LIMIT,
  LIVE_SPENDING_CAP_REASON,
} from '../constants/live-billing.constants';
import { LiveSettleConflictError } from '../errors/live-settle-conflict.error';
import { LiveBillingRepository } from '../repositories/live-billing.repository';
import type {
  LiveBillableSession,
  LiveBlock,
  LiveChargeInput,
  LiveSettleContext,
  LiveSettleResult,
  LiveTx,
} from '../types/live-billing.types';
import {
  isUniqueViolation,
  liveBlockCostMicroUsd,
  liveBlockKey,
  withinSpendingCap,
} from '../utilities/live-billing.utility';
import { LivePaidBlockManager } from './live-paid-block.manager';

/**
 * Settles one block (architecture doc section 6): free monthly seconds first
 * (atomic conditional update), then paid only with an explicit approval and
 * within the optional cap, then one grace window per exhaustion episode.
 * Every committed block writes one immutable LiveUsageCharge whose
 * idempotencyKey is the block key, in the same transaction that advances the
 * session's block index — so a retry can never charge twice.
 */
@Injectable()
export class LiveBlockSettlementManager {
  private readonly logger = new Logger(LiveBlockSettlementManager.name);

  constructor(
    private readonly repository: LiveBillingRepository,
    private readonly paid: LivePaidBlockManager,
    @Inject(LIVE_EVENT_PUBLISHER) private readonly publisher: LiveEventPublisher,
  ) {}

  async settle(block: LiveBlock, ctx: LiveSettleContext): Promise<LiveSettleResult> {
    const { session } = block;
    const month = await this.repository.ensureMonth(session.userId, ctx.month);
    const freeLeft = Math.max(0, ctx.plan.freeSecondsPerMonth - month.freeSecondsUsed);
    if (freeLeft === 0) return this.settlePaid(block, ctx);

    const take = Math.min(freeLeft, block.seconds);
    const committed = await this.commit(block, ctx, take, async (tx) => {
      const taken = await this.repository.takeFreeSeconds(
        tx,
        session.userId,
        ctx.month,
        take,
        ctx.plan.freeSecondsPerMonth,
      );
      if (!taken) throw new LiveSettleConflictError('FREE_SECONDS_RACE');
      await this.repository.createCharge(
        tx,
        this.charge(block, ctx, LiveChargeKind.FREE, take, 0n, null),
      );
    });
    if (!committed) return { outcome: LiveSettleOutcome.SKIPPED, state: session.state };
    if (take === block.seconds) return { outcome: LiveSettleOutcome.FREE, state: session.state };

    // The free seconds ran out inside this block: the rest is the next block, on the paid path.
    const nextIndex = block.blockIndex + 1;
    const rest: LiveBillableSession = {
      ...session,
      nextBlockIndex: nextIndex,
      pendingSeconds: session.pendingSeconds - take,
    };
    return this.settlePaid(
      {
        session: rest,
        blockIndex: nextIndex,
        seconds: block.seconds - take,
        key: liveBlockKey(session.id, nextIndex),
      },
      ctx,
    );
  }

  /** GRACE → EXHAUSTED once the user's grace window has elapsed. */
  async expireGraceIfDue(
    session: LiveBillableSession,
    graceSeconds: number,
    now: Date,
  ): Promise<LiveSessionState> {
    if (session.state !== LiveSessionState.GRACE) return session.state;
    const billing = await this.repository.findBillingState(session.userId);
    if (!this.graceElapsed(billing?.graceStartedAt ?? null, graceSeconds, now))
      return session.state;
    const moved = await this.repository.setSessionState(
      session.id,
      LiveSessionState.GRACE,
      LiveSessionState.EXHAUSTED,
    );
    if (moved)
      await this.publishStatus(session, LiveStatusCode.EXHAUSTED, LiveSessionState.EXHAUSTED);
    return LiveSessionState.EXHAUSTED;
  }

  private async settlePaid(block: LiveBlock, ctx: LiveSettleContext): Promise<LiveSettleResult> {
    const { session } = block;
    if (!session.paidApprovedAt) {
      return this.stop(
        block,
        ctx,
        LiveSessionState.CREDITS_REQUIRED,
        LiveStatusCode.FREE_EXHAUSTED,
      );
    }
    const cost = liveBlockCostMicroUsd(ctx.plan.paidMicroUsdPerMinute, block.seconds);
    if (!withinSpendingCap(session.spentMicroUsd, cost, session.spendingCapMicroUsd)) {
      return this.stop(
        block,
        ctx,
        LiveSessionState.CREDITS_REQUIRED,
        LiveStatusCode.CREDITS_REQUIRED,
        {
          reason: LIVE_SPENDING_CAP_REASON,
        },
      );
    }
    const reserved = await this.paid.reserve(block, ctx.plan.paidMicroUsdPerMinute);
    if (reserved.held) return this.commitPaid(block, ctx, reserved.hold, cost);
    return reserved.refusal === LiveCreditRefusal.METER_UNAVAILABLE
      ? this.meterFailure(block, ctx)
      : this.grace(block, ctx);
  }

  private async commitPaid(
    block: LiveBlock,
    ctx: LiveSettleContext,
    hold: PaygHold,
    cost: bigint,
  ): Promise<LiveSettleResult> {
    const { session } = block;
    // An unmetered hold (admin, metering disabled) moves no money: the ledger says so.
    const charged = hold.metered ? cost : 0n;
    const state = ctx.final ? undefined : LiveSessionState.ACTIVE;
    // Ledger first, then finalize: a crash between the two leaves the hold to
    // the auth sweeper (the user is under-charged, never double-charged).
    const committed = await this.commit(
      block,
      ctx,
      block.seconds,
      async (tx) => {
        await this.repository.createCharge(
          tx,
          this.charge(block, ctx, LiveChargeKind.PAID, block.seconds, charged, hold.reservationId),
        );
        await this.repository.addPaidSeconds(tx, session.userId, ctx.month, block.seconds);
      },
      { state, spentMicroUsd: charged },
    );
    if (!committed) return { outcome: LiveSettleOutcome.SKIPPED, state: session.state };
    await this.paid.finalize(block, hold, ctx.plan.paidMicroUsdPerMinute);
    await this.repository.resetGrace(session.userId);
    await this.paid.clearMeterFailures(session.id);
    return { outcome: LiveSettleOutcome.PAID, state: state ?? session.state };
  }

  /**
   * Meter unreachable: charge nothing, keep the seconds pending, retry next
   * tick. After LIVE_METER_FAILURE_LIMIT consecutive failures the AI stops, so
   * an outage cannot become unbounded free service.
   */
  private async meterFailure(block: LiveBlock, ctx: LiveSettleContext): Promise<LiveSettleResult> {
    const failures = await this.paid.recordMeterFailure(block.session.id);
    this.logger.warn(
      `meter unavailable sessionId=${block.session.id} consecutive=${String(failures)}`,
    );
    if (failures < LIVE_METER_FAILURE_LIMIT) {
      return { outcome: LiveSettleOutcome.DEFERRED, state: block.session.state };
    }
    const result = await this.stop(
      block,
      ctx,
      LiveSessionState.EXHAUSTED,
      LiveStatusCode.EXHAUSTED,
      {
        reason: 'METER_UNAVAILABLE',
      },
    );
    return result;
  }

  /** Insufficient credit: one grace window per exhaustion episode, then EXHAUSTED. */
  private async grace(block: LiveBlock, ctx: LiveSettleContext): Promise<LiveSettleResult> {
    const { session } = block;
    await this.repository.ensureBillingState(session.userId);
    const started =
      ctx.graceSeconds > 0 && (await this.repository.startGrace(session.userId, ctx.now));
    if (!started) {
      const billing = await this.repository.findBillingState(session.userId);
      const startedAt = billing?.graceStartedAt ?? null;
      if (startedAt === null || this.graceElapsed(startedAt, ctx.graceSeconds, ctx.now)) {
        return this.stop(block, ctx, LiveSessionState.EXHAUSTED, LiveStatusCode.EXHAUSTED);
      }
    }
    const state = ctx.final ? undefined : LiveSessionState.GRACE;
    const committed = await this.commit(
      block,
      ctx,
      block.seconds,
      async (tx) => {
        await this.repository.createCharge(
          tx,
          this.charge(block, ctx, LiveChargeKind.GRACE, block.seconds, 0n, null),
        );
      },
      { state },
    );
    if (started) await this.publishStatus(session, LiveStatusCode.GRACE, LiveSessionState.GRACE);
    return {
      outcome: committed ? LiveSettleOutcome.GRACE : LiveSettleOutcome.SKIPPED,
      state: state ?? session.state,
    };
  }

  /** Stops AI for the session (state + drop the unbillable pending seconds) and tells the viewer. */
  private async stop(
    block: LiveBlock,
    ctx: LiveSettleContext,
    state: LiveSessionState,
    status: LiveStatusCode,
    extra: Record<string, unknown> = {},
  ): Promise<LiveSettleResult> {
    await this.repository.stopSession(block.session.id, ctx.final ? null : state);
    if (!ctx.final) await this.publishStatus(block.session, status, state, extra);
    const outcome =
      state === LiveSessionState.EXHAUSTED
        ? LiveSettleOutcome.EXHAUSTED
        : LiveSettleOutcome.CREDITS_REQUIRED;
    return { outcome, state: ctx.final ? block.session.state : state };
  }

  /**
   * Runs the block's writes and the fenced session advance in one transaction.
   * False when another caller already settled the block (unique key or fence).
   */
  private async commit(
    block: LiveBlock,
    ctx: LiveSettleContext,
    seconds: number,
    writes: (tx: LiveTx) => Promise<void>,
    advance: { state?: LiveSessionState; spentMicroUsd?: bigint } = {},
  ): Promise<boolean> {
    try {
      await this.repository.transaction(async (tx) => {
        await writes(tx);
        const advanced = await this.repository.advanceSession(tx, {
          sessionId: block.session.id,
          expectedBlockIndex: block.blockIndex,
          seconds,
          ...(advance.state && !ctx.final ? { state: advance.state } : {}),
          ...(advance.spentMicroUsd ? { spentMicroUsd: advance.spentMicroUsd } : {}),
        });
        if (!advanced) throw new LiveSettleConflictError('BLOCK_ALREADY_ADVANCED');
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof LiveSettleConflictError || isUniqueViolation(error)) {
        this.logger.warn(
          `settle skipped key=${block.key} reason=${error instanceof Error ? error.message : 'unique'}`,
        );
        return false;
      }
      throw error;
    }
  }

  private charge(
    block: LiveBlock,
    ctx: LiveSettleContext,
    kind: LiveChargeKind,
    seconds: number,
    microUsd: bigint,
    reservationId: string | null,
  ): LiveChargeInput {
    return {
      idempotencyKey: block.key,
      userId: block.session.userId,
      sessionId: block.session.id,
      runId: block.session.runId,
      kind,
      seconds,
      microUsd,
      reservationId,
      policyVersion: ctx.policyVersion,
    };
  }

  private graceElapsed(startedAt: Date | null, graceSeconds: number, now: Date): boolean {
    return startedAt === null || now.getTime() - startedAt.getTime() >= graceSeconds * 1000;
  }

  private async publishStatus(
    session: LiveBillableSession,
    status: LiveStatusCode,
    sessionState: LiveSessionState,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (session.runId === null) return;
    await this.publisher.publish({
      type: LiveStreamEventType.STATUS,
      runId: session.runId,
      startAt: Date.now(),
      status,
      data: { sessionId: session.id, sessionState, ...extra },
    });
  }
}
