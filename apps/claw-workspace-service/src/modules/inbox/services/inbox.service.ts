import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  INBOX_DEFAULT_LOOKBACK_DAYS,
  INBOX_DEFAULT_PAGE_SIZE,
  INBOX_MAX_PAGE_SIZE,
} from '../constants/inbox.constants';
import type { InboxFilter, InboxItem, InboxPage } from '../types/inbox.types';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Server-paginated cross-provider inbox. Sort key: externalUpdatedAt DESC,
   * id DESC for tie-breaks. Cursor format: `<isoDate>__<id>`.
   */
  async list(filter: InboxFilter): Promise<InboxPage> {
    const limit = Math.max(
      1,
      Math.min(INBOX_MAX_PAGE_SIZE, filter.limit ?? INBOX_DEFAULT_PAGE_SIZE),
    );
    this.logger.debug(
      `list: userId=${filter.userId} providers=${(filter.providers ?? []).join(',')} types=${(filter.types ?? []).join(',')} limit=${String(limit)}`,
    );
    const where = this.buildWhere(filter);
    const rows = await this.prisma.workspaceObject.findMany({
      where: where as never,
      orderBy: [{ externalUpdatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => this.toItem(r));
    const last = items.at(-1);
    const nextCursor =
      hasMore && last !== undefined && last.externalUpdatedAt !== null
        ? this.encodeCursor(last.externalUpdatedAt, last.id)
        : null;
    return { items, nextCursor, totalCount: items.length };
  }

  private buildWhere(filter: InboxFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { userId: filter.userId };
    if (filter.providers !== undefined && filter.providers.length > 0) {
      where['provider'] = { in: filter.providers };
    }
    if (filter.types !== undefined && filter.types.length > 0) {
      where['type'] = { in: filter.types };
    }
    const dateFloor =
      filter.dateFrom ?? new Date(Date.now() - INBOX_DEFAULT_LOOKBACK_DAYS * 86_400_000);
    where['externalUpdatedAt'] = {
      gte: dateFloor,
      ...(filter.dateTo !== undefined ? { lte: filter.dateTo } : {}),
    };
    if (filter.needsAttention === true) {
      where['metadata'] = { path: ['needsAttention'], equals: true };
    }
    if (filter.hasSuggestion === true) {
      where['metadata'] = { path: ['hasSuggestion'], equals: true };
    }
    const cursor = this.parseCursor(filter.cursor);
    if (cursor !== null) {
      where['OR'] = [
        { externalUpdatedAt: { lt: cursor.updatedAt } },
        { AND: [{ externalUpdatedAt: cursor.updatedAt }, { id: { lt: cursor.id } }] },
      ];
    }
    return where;
  }

  /**
   * Stream 30.2 — toggle the `needsAttention` flag stored under
   * `WorkspaceObject.metadata.needsAttention`. Writes are user-scoped: callers
   * pass `userId` and we 404 if the row doesn't belong to them.
   */
  async setNeedsAttention(
    userId: string,
    objectId: string,
    needsAttention: boolean,
  ): Promise<{ updated: boolean }> {
    this.logger.log(
      `setNeedsAttention: userId=${userId} id=${objectId} → ${String(needsAttention)}`,
    );
    const existing = await this.prisma.workspaceObject.findUnique({
      where: { id: objectId },
      select: { userId: true, metadata: true },
    });
    if (existing?.userId !== userId) {
      return { updated: false };
    }
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    meta['needsAttention'] = needsAttention;
    await this.prisma.workspaceObject.update({
      where: { id: objectId },
      data: { metadata: meta as never },
    });
    return { updated: true };
  }

  private toItem(row: {
    id: string;
    externalId: string;
    type: string;
    title: string;
    content: string | null;
    url: string | null;
    provider: string;
    authorId: string | null;
    externalUpdatedAt: Date | null;
    metadata: unknown;
  }): InboxItem {
    const meta = (row.metadata ?? {}) as { hasSuggestion?: boolean; needsAttention?: boolean };
    return {
      id: row.id,
      externalId: row.externalId,
      type: row.type,
      title: row.title,
      contentSnippet: row.content !== null ? row.content.slice(0, 240) : null,
      url: row.url,
      provider: row.provider,
      authorId: row.authorId,
      externalUpdatedAt: row.externalUpdatedAt,
      hasSuggestion: meta.hasSuggestion === true,
      needsAttention: meta.needsAttention === true,
    };
  }

  private encodeCursor(updatedAt: Date, id: string): string {
    return `${updatedAt.toISOString()}__${id}`;
  }

  private parseCursor(raw: string | undefined): { updatedAt: Date; id: string } | null {
    if (raw === undefined || raw.length === 0) return null;
    const parts = raw.split('__');
    if (parts.length !== 2) return null;
    const date = new Date(parts[0] ?? '');
    if (Number.isNaN(date.getTime())) return null;
    return { updatedAt: date, id: parts[1] ?? '' };
  }
}
