import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { isValidPublicShareId } from '../../../common/utilities/public-share-id.utility';
import { SITEMAP_FEED_PAGE_SIZE } from '../constants/public-share-route.constants';
import { ChatSharesRepository } from '../repositories/chat-shares.repository';
import { ChatShareMapperService } from './chat-share-mapper.service';
import { type PublicChatShareResponse } from '../types/chat-shares.types';
import type {
  PublicChatRssEntry,
  PublicChatSitemapCount,
  PublicChatSitemapPage,
} from '../types/chat-share-discovery.types';
import type { Locale } from '@claw/shared-types';
import { decodeSitemapCursor, encodeSitemapCursor } from '../utilities/sitemap-cursor.utility';
import { parseStoredLocale } from '../utilities/stored-locale.utility';

/**
 * The read path for unauthenticated visitors.
 *
 * Returns null for everything unavailable — private, revoked, deleted,
 * malformed, never-existed. The controller turns all of them into the same
 * 404, so the endpoint cannot be used to learn that an identifier was once
 * valid.
 */
@Injectable()
export class PublicChatShareService {
  private readonly logger = new Logger(PublicChatShareService.name);

  constructor(
    private readonly shares: ChatSharesRepository,
    private readonly mapper: ChatShareMapperService,
  ) {}

  /**
   * Resolves a share for a visitor, or throws a bare 404.
   *
   * ONE exception shape covers private, revoked, deleted, malformed and
   * never-existed. Distinguishing them would confirm that an identifier was
   * once valid — which is precisely what the owner revoked.
   */
  async requirePublic(publicShareId: string): Promise<PublicChatShareResponse> {
    const share = await this.findPublic(publicShareId);
    if (share === null) {
      throw new NotFoundException();
    }
    return share;
  }

  private async findPublic(publicShareId: string): Promise<PublicChatShareResponse | null> {
    // Shape-checked before the database is touched, so an enumeration sweep is
    // refused at the edge rather than costing a query per attempt.
    if (!isValidPublicShareId(publicShareId)) {
      this.logger.debug('findPublic: malformed identifier rejected');
      return null;
    }
    const share = await this.shares.findPublicByShareId(publicShareId);
    if (share === null) {
      this.logger.debug('findPublic: no active public share');
      return null;
    }
    return this.mapper.toPublicResponse(share);
  }

  /**
   * The sitemap feed.
   *
   * Only the identifier and a timestamp leave. No user id, no thread id, no
   * title — a sitemap is a public document, and a leaked title would publish a
   * conversation's subject to anyone who fetched it.
   */
  async listSitemapEntries(
    locale: Locale,
    limit: number = SITEMAP_FEED_PAGE_SIZE,
    cursor: string | null = null,
  ): Promise<PublicChatSitemapPage> {
    this.logger.debug(`listSitemapEntries: limit=${String(limit)}`);
    const decodedCursor = cursor === null ? null : decodeSitemapCursor(cursor);
    if (cursor !== null && decodedCursor === null) {
      return { items: [], nextCursor: null };
    }
    const shares = await this.shares.listIndexable(locale, limit, decodedCursor);
    const last = shares.at(-1);
    return {
      items: shares.map((share) => ({
        publicShareId: share.publicShareId,
        contentLocale: parseStoredLocale(share.contentLocale),
        updatedAt: share.updatedAt.toISOString(),
      })),
      nextCursor:
        shares.length === limit && last !== undefined
          ? encodeSitemapCursor({ updatedAt: last.updatedAt, id: last.id })
          : null,
    };
  }

  async countSitemapEntries(locale: Locale): Promise<PublicChatSitemapCount> {
    return { locale, count: await this.shares.countIndexable(locale) };
  }

  async listRssEntries(locale: Locale, limit: number = 100): Promise<PublicChatRssEntry[]> {
    const shares = await this.shares.listIndexable(locale, limit, null);
    return shares.map((share) => ({
      publicShareId: share.publicShareId,
      contentLocale: parseStoredLocale(share.contentLocale),
      title: share.title,
      description: share.description,
      publishedAt: share.publishedAt.toISOString(),
      updatedAt: share.updatedAt.toISOString(),
    }));
  }
}
