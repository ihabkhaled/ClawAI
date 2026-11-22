import { Injectable } from '@nestjs/common';

import { LiveTranslationTarget, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SESSION_INCLUDE } from '../constants/history.constants';
import type {
  CoverageInterval,
  HistoryCursor,
  SessionRowWithStream,
  StoredEventRow,
  StoredTranslation,
} from '../types/history.types';

@Injectable()
export class HistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's sessions, newest first; `take` is limit + 1 so the caller can tell if more remain. */
  listSessions(
    userId: string,
    cursorAt: Date | null,
    cursor: HistoryCursor | null,
    take: number,
  ): Promise<SessionRowWithStream[]> {
    const after =
      cursorAt !== null && cursor !== null
        ? {
            OR: [{ createdAt: { lt: cursorAt } }, { createdAt: cursorAt, id: { lt: cursor.id } }],
          }
        : {};
    return this.prisma.liveViewerSession.findMany({
      where: { userId, ...after },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      include: SESSION_INCLUDE,
    });
  }

  findOwnedSession(userId: string, sessionId: string): Promise<SessionRowWithStream | null> {
    return this.prisma.liveViewerSession.findFirst({
      where: { id: sessionId, userId },
      include: SESSION_INCLUDE,
    });
  }

  listCoverage(sessionId: string): Promise<CoverageInterval[]> {
    return this.prisma.liveSessionCoverage.findMany({
      where: { sessionId },
      orderBy: { fromAt: 'asc' },
      select: { id: true, fromAt: true, toAt: true, endsInGap: true },
    });
  }

  /**
   * Ids of the run's cards whose [startAt, endAt ?? startAt] intersects any coverage interval of the
   * session, in (startAt, id) order, after the cursor.
   */
  async eventIdsInCoverage(
    runId: string,
    sessionId: string,
    cursor: HistoryCursor | null,
    take: number,
  ): Promise<string[]> {
    const after =
      cursor === null
        ? Prisma.empty
        : Prisma.sql`AND (e.start_at, e.id) > (${BigInt(cursor.at)}, ${cursor.id})`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT e.id
      FROM live_feed_events e
      WHERE e.run_id = ${runId}
        AND EXISTS (
          SELECT 1 FROM live_session_coverage c
          WHERE c.session_id = ${sessionId}
            AND c.from_at <= COALESCE(e.end_at, e.start_at)
            AND c.to_at >= e.start_at
        )
        ${after}
      ORDER BY e.start_at ASC, e.id ASC
      LIMIT ${take}
    `);
    return rows.map((row) => row.id);
  }

  async eventsByIds(ids: string[]): Promise<StoredEventRow[]> {
    const rows = await this.prisma.liveFeedEvent.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row === undefined ? [] : [row];
    });
  }

  async translationsFor(ids: string[], language: string): Promise<StoredTranslation[]> {
    return this.prisma.liveTranslation.findMany({
      where: { targetKind: LiveTranslationTarget.EVENT, targetId: { in: ids }, language },
      select: { targetId: true, sourceVersion: true, title: true, text: true },
    });
  }

  findEvent(eventId: string): Promise<{
    id: string;
    runId: string;
    startAt: bigint;
    endAt: bigint | null;
    version: number;
  } | null> {
    return this.prisma.liveFeedEvent.findUnique({
      where: { id: eventId },
      select: { id: true, runId: true, startAt: true, endAt: true, version: true },
    });
  }

  /** The user's newest session on the event's run whose coverage includes the event, or null. */
  findSessionCoveringEvent(
    userId: string,
    event: { runId: string; startAt: bigint; endAt: bigint | null },
  ): Promise<{ id: string } | null> {
    return this.prisma.liveViewerSession.findFirst({
      where: {
        userId,
        runId: event.runId,
        coverage: {
          some: { fromAt: { lte: event.endAt ?? event.startAt }, toAt: { gte: event.startAt } },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }

  listVersions(
    eventId: string,
    take: number,
  ): Promise<{ version: number; title: string; body: string; createdAt: Date }[]> {
    return this.prisma.liveFeedEventVersion.findMany({
      where: { eventId },
      orderBy: { version: 'asc' },
      take,
      select: { version: true, title: true, body: true, createdAt: true },
    });
  }
}
