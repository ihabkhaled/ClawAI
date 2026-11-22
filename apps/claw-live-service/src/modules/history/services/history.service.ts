import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { EVENT_CURSOR_DIGITS, VERSIONS_MAX_ROWS } from '../constants/history.constants';
import type { HistoryEventsQuery, HistoryListQuery } from '../dto/history.dto';
import { HistoryRepository } from '../repositories/history.repository';
import type {
  HistoryCursor,
  HistoryEventView,
  HistoryPage,
  HistorySessionView,
  HistoryVersionView,
  SessionRowWithStream,
  StoredEventRow,
} from '../types/history.types';
import { decodeHistoryCursor, encodeHistoryCursor } from '../utilities/history-cursor.utility';
import { buildGapMarkers, gapsForPage, mergeByStart } from '../utilities/history-gap.utility';
import { toEventView, toSessionView } from '../utilities/history-view.utility';

@Injectable()
export class HistoryService {
  constructor(private readonly repository: HistoryRepository) {}

  async listSessions(
    userId: string,
    query: HistoryListQuery,
  ): Promise<HistoryPage<HistorySessionView>> {
    const cursor = decodeHistoryCursor(query.cursor);
    const cursorAt = cursor === null ? null : this.parseDate(cursor);
    const rows = await this.repository.listSessions(userId, cursorAt, cursor, query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    const hasMore = rows.length > query.limit && last !== undefined;
    return {
      items: page.map((row) => toSessionView(row, userId)),
      nextCursor: hasMore ? encodeHistoryCursor(last.createdAt.toISOString(), last.id) : null,
    };
  }

  /** The owner's session or a 404: a stranger's id is indistinguishable from a missing one. */
  async requireOwnedSession(userId: string, sessionId: string): Promise<SessionRowWithStream> {
    const session = await this.repository.findOwnedSession(userId, sessionId);
    if (session === null) throw new NotFoundException(LiveHistoryErrorCode.SESSION_NOT_FOUND);
    return session;
  }

  async listEvents(
    userId: string,
    sessionId: string,
    query: HistoryEventsQuery,
  ): Promise<HistoryPage<HistoryEventView>> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const cursor = decodeHistoryCursor(query.cursor);
    if (cursor !== null && !EVENT_CURSOR_DIGITS.test(cursor.at)) {
      throw new BadRequestException(LiveHistoryErrorCode.INVALID_CURSOR);
    }
    const gaps = buildGapMarkers(await this.repository.listCoverage(sessionId));
    if (session.runId === null) {
      return { items: gapsForPage(gaps, null, null), nextCursor: null };
    }
    const ids = await this.repository.eventIdsInCoverage(
      session.runId,
      sessionId,
      cursor,
      query.limit + 1,
    );
    const hasMore = ids.length > query.limit;
    const rows = await this.repository.eventsByIds(ids.slice(0, query.limit));
    const events = await this.toViews(rows, query.language);
    const last = rows.at(-1);
    const lower = cursor === null ? null : Number(cursor.at);
    const upper = hasMore && last !== undefined ? Number(last.startAt) : null;
    return {
      items: mergeByStart(events, gapsForPage(gaps, lower, upper)),
      nextCursor:
        hasMore && last !== undefined
          ? encodeHistoryCursor(last.startAt.toString(), last.id)
          : null,
    };
  }

  /** Every card of the session, paged internally, up to `maxEvents`. Used by the export. */
  async collectEvents(
    userId: string,
    sessionId: string,
    pageSize: number,
    maxEvents: number,
  ): Promise<{ events: HistoryEventView[]; truncated: boolean }> {
    const events: HistoryEventView[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.listEvents(userId, sessionId, { cursor, limit: pageSize });
      events.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined && events.length < maxEvents);
    return { events: events.slice(0, maxEvents), truncated: cursor !== undefined };
  }

  async listVersions(userId: string, eventId: string): Promise<HistoryVersionView[]> {
    const event = await this.repository.findEvent(eventId);
    const session =
      event === null ? null : await this.repository.findSessionCoveringEvent(userId, event);
    if (event === null || session === null) {
      throw new NotFoundException(LiveHistoryErrorCode.EVENT_NOT_FOUND);
    }
    const versions = await this.repository.listVersions(eventId, VERSIONS_MAX_ROWS);
    return versions.map((version) => ({
      version: version.version,
      title: version.title,
      body: version.body,
      createdAt: version.createdAt.toISOString(),
    }));
  }

  private parseDate(cursor: HistoryCursor): Date {
    const date = new Date(cursor.at);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException(LiveHistoryErrorCode.INVALID_CURSOR);
    return date;
  }

  private async toViews(
    rows: StoredEventRow[],
    language: string | undefined,
  ): Promise<HistoryEventView[]> {
    if (language === undefined || rows.length === 0) {
      return rows.map((row) => toEventView(row, undefined));
    }
    const translations = await this.repository.translationsFor(
      rows.map((row) => row.id),
      language,
    );
    return rows.map((row) =>
      toEventView(
        row,
        translations.find((item) => item.targetId === row.id && item.sourceVersion === row.version),
      ),
    );
  }
}
