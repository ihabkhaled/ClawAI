import { Injectable } from '@nestjs/common';

import {
  type LiveCapability,
  type LiveMode,
  LiveSessionState,
  type LiveViewerSession,
  type Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LIVE_OPEN_SESSION_STATES } from '../constants/live-session.constants';
import type { LiveHeartbeatWrite, LiveRunAccrualView } from '../types/live-session.types';

/** LiveViewerSession rows. Every user-facing read carries the owner in its WHERE clause. */
@Injectable()
export class LiveSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.LiveViewerSessionUncheckedCreateInput): Promise<LiveViewerSession> {
    return this.prisma.liveViewerSession.create({ data });
  }

  findOwned(sessionId: string, userId: string): Promise<LiveViewerSession | null> {
    return this.prisma.liveViewerSession.findFirst({ where: { id: sessionId, userId } });
  }

  findById(sessionId: string): Promise<LiveViewerSession | null> {
    return this.prisma.liveViewerSession.findUnique({ where: { id: sessionId } });
  }

  async findStreamCapability(streamId: string): Promise<LiveCapability | null> {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { capability: true },
    });
    return stream?.capability ?? null;
  }

  countOpen(userId: string): Promise<number> {
    return this.prisma.liveViewerSession.count({
      where: { userId, state: { in: [...LIVE_OPEN_SESSION_STATES] } },
    });
  }

  findRun(runId: string): Promise<LiveRunAccrualView | null> {
    return this.prisma.liveProcessingRun.findUnique({
      where: { id: runId },
      select: { status: true, lastCommitAt: true, startedAt: true, processedMediaSeconds: true },
    });
  }

  /** Applies a heartbeat, fenced on the state it was computed from. False when the state moved. */
  async recordHeartbeat(sessionId: string, write: LiveHeartbeatWrite): Promise<boolean> {
    const result = await this.prisma.liveViewerSession.updateMany({
      // A summary's media accrual is also fenced on what was already accrued, so two heartbeats
      // racing on the same progress can never bill it twice.
      where: {
        id: sessionId,
        state: write.expectedState,
        ...(write.media ? { accruedMediaSeconds: write.media.from } : {}),
      },
      data: {
        state: write.state,
        lastHeartbeatAt: write.lastHeartbeatAt,
        lastPlaybackAt: write.lastPlaybackAt,
        ...(write.pendingIncrement > 0
          ? { pendingSeconds: { increment: write.pendingIncrement } }
          : {}),
        ...(write.media ? { accruedMediaSeconds: write.media.to } : {}),
      },
    });
    return result.count === 1;
  }

  /** Liveness only (no state, no accrual) — used when the fenced write lost a race. */
  async touch(sessionId: string, at: Date, playbackAt: bigint): Promise<void> {
    await this.prisma.liveViewerSession.updateMany({
      where: { id: sessionId, state: { not: LiveSessionState.DETACHED } },
      data: { lastHeartbeatAt: at, lastPlaybackAt: playbackAt },
    });
  }

  async approve(sessionId: string, at: Date, cap: bigint | null, resume: boolean): Promise<void> {
    await this.prisma.liveViewerSession.updateMany({
      where: {
        id: sessionId,
        state: { notIn: [LiveSessionState.DETACHED, LiveSessionState.UNSUPPORTED] },
      },
      data: {
        paidApprovedAt: at,
        spendingCapMicroUsd: cap,
        ...(resume ? { state: LiveSessionState.ACTIVE } : {}),
      },
    });
  }

  async updateLanguage(sessionId: string, language: string): Promise<void> {
    await this.prisma.liveViewerSession.update({ where: { id: sessionId }, data: { language } });
  }

  async switchRun(sessionId: string, mode: LiveMode, runId: string): Promise<void> {
    await this.prisma.liveViewerSession.update({
      where: { id: sessionId },
      data: { mode, runId, pendingSeconds: 0 },
    });
  }

  /** The one winning closer gets true; a second close (reaper, beacon, DELETE) is a no-op. */
  async markDetached(sessionId: string, at: Date): Promise<boolean> {
    const result = await this.prisma.liveViewerSession.updateMany({
      where: { id: sessionId, state: { not: LiveSessionState.DETACHED } },
      data: { state: LiveSessionState.DETACHED, detachedAt: at },
    });
    return result.count === 1;
  }

  /** Open sessions with a run whose last heartbeat (or start, before any) is older than `before`. */
  findStale(before: Date, limit: number): Promise<LiveViewerSession[]> {
    return this.prisma.liveViewerSession.findMany({
      where: {
        state: { in: [...LIVE_OPEN_SESSION_STATES] },
        runId: { not: null },
        OR: [
          { lastHeartbeatAt: { lt: before } },
          { lastHeartbeatAt: null, startedAt: { lt: before } },
        ],
      },
      take: limit,
    });
  }
}
