import { Injectable } from '@nestjs/common';

import {
  type LiveBillingState,
  type LiveSessionState,
  type LiveUsageCharge,
  type LiveUsageMonth,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LiveChargeInput, LiveSessionAdvance, LiveTx } from '../types/live-billing.types';

/**
 * The billing tables: LiveUsageMonth (free seconds), LiveUsageCharge (the
 * immutable ledger), LiveBillingState (grace) and the session's billing
 * counters. Writes that must commit together take a transaction client.
 */
@Injectable()
export class LiveBillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: LiveTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  findCharge(idempotencyKey: string): Promise<LiveUsageCharge | null> {
    return this.prisma.liveUsageCharge.findUnique({ where: { idempotencyKey } });
  }

  async createCharge(tx: LiveTx, input: LiveChargeInput): Promise<void> {
    await tx.liveUsageCharge.create({ data: input });
  }

  ensureMonth(userId: string, month: string): Promise<LiveUsageMonth> {
    return this.prisma.liveUsageMonth.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month },
      update: {},
    });
  }

  findMonth(userId: string, month: string): Promise<LiveUsageMonth | null> {
    return this.prisma.liveUsageMonth.findUnique({ where: { userId_month: { userId, month } } });
  }

  /** Atomic conditional take: succeeds only while used + take stays within the plan's free seconds. */
  async takeFreeSeconds(
    tx: LiveTx,
    userId: string,
    month: string,
    take: number,
    freeLimit: number,
  ): Promise<boolean> {
    const result = await tx.liveUsageMonth.updateMany({
      where: { userId, month, freeSecondsUsed: { lte: freeLimit - take } },
      data: { freeSecondsUsed: { increment: take } },
    });
    return result.count === 1;
  }

  async addPaidSeconds(tx: LiveTx, userId: string, month: string, seconds: number): Promise<void> {
    await tx.liveUsageMonth.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, paidSeconds: seconds },
      update: { paidSeconds: { increment: seconds } },
    });
  }

  /** Commits a block on the session, fenced on the block index so a block advances once. */
  async advanceSession(tx: LiveTx, advance: LiveSessionAdvance): Promise<boolean> {
    const result = await tx.liveViewerSession.updateMany({
      where: { id: advance.sessionId, nextBlockIndex: advance.expectedBlockIndex },
      data: {
        pendingSeconds: { decrement: advance.seconds },
        billedSeconds: { increment: advance.seconds },
        nextBlockIndex: { increment: 1 },
        ...(advance.state ? { state: advance.state } : {}),
        ...(advance.spentMicroUsd ? { spentMicroUsd: { increment: advance.spentMicroUsd } } : {}),
      },
    });
    return result.count === 1;
  }

  /** Stops AI for the session: new state (unless only dropping) and no pending seconds. */
  async stopSession(sessionId: string, state: LiveSessionState | null): Promise<void> {
    await this.prisma.liveViewerSession.updateMany({
      where: { id: sessionId, state: { not: 'DETACHED' } },
      data: { pendingSeconds: 0, ...(state ? { state } : {}) },
    });
  }

  async setSessionState(
    sessionId: string,
    from: LiveSessionState,
    to: LiveSessionState,
  ): Promise<boolean> {
    const result = await this.prisma.liveViewerSession.updateMany({
      where: { id: sessionId, state: from },
      data: { state: to },
    });
    return result.count === 1;
  }

  ensureBillingState(userId: string): Promise<LiveBillingState> {
    return this.prisma.liveBillingState.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  findBillingState(userId: string): Promise<LiveBillingState | null> {
    return this.prisma.liveBillingState.findUnique({ where: { userId } });
  }

  /** Opens a grace window only when none is consumed: the one atomic winner gets true. */
  async startGrace(userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.liveBillingState.updateMany({
      where: { userId, graceConsumed: false },
      data: { graceConsumed: true, graceStartedAt: now },
    });
    return result.count === 1;
  }

  /** A successful paid block ends the exhaustion episode. */
  async resetGrace(userId: string): Promise<void> {
    await this.prisma.liveBillingState.updateMany({
      where: { userId, graceConsumed: true },
      data: { graceConsumed: false, graceStartedAt: null },
    });
  }
}
