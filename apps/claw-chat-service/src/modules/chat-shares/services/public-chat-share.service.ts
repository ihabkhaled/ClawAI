import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type Response } from 'express';

import { isValidPublicShareId } from '../../../common/utilities/public-share-id.utility';
import { SITEMAP_FEED_PAGE_SIZE } from '../constants/public-share-route.constants';
import { ShareAssetAdapter } from '../adapters/share-asset.adapter';
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
    private readonly assets: ShareAssetAdapter,
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

  /**
   * Streams one published image, or 404.
   *
   * The same uniform 404 as everything else on this surface: a caller cannot
   * tell a revoked share from a wrong asset id from a share that never existed.
   *
   * Bytes are fetched from file-service over the service-token path and piped
   * through — chat-service knows whether the share is live, file-service owns
   * the storage, and neither has to learn the other's job.
   */
  async streamPublicAsset(
    publicShareId: string,
    publicAssetId: string,
    response: Response,
  ): Promise<void> {
    if (!isValidPublicShareId(publicShareId)) {
      throw new NotFoundException();
    }
    const asset = await this.shares.findPublicAsset(publicShareId, publicAssetId);
    if (asset === null) {
      this.logger.debug('streamPublicAsset: no asset on an active share');
      throw new NotFoundException();
    }

    // The status has to be decided before the first byte goes out — once the
    // body has started, a 404 is no longer expressible.
    response.setHeader('Content-Type', asset.mimeType);
    const streamed = await this.assets.streamCopyTo(asset.storedFileId, response);
    if (!streamed) {
      this.logger.error('streamPublicAsset: stored copy unreadable');
      throw new NotFoundException();
    }
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
