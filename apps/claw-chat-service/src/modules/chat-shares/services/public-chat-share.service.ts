import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { isValidPublicShareId } from '../../../common/utilities/public-share-id.utility';
import { SITEMAP_FEED_PAGE_SIZE } from '../constants/public-share-route.constants';
import { ChatSharesRepository } from '../repositories/chat-shares.repository';
import { ChatShareMapperService } from './chat-share-mapper.service';
import {
  type PublicChatShareResponse,
  type PublicChatSitemapEntry,
} from '../types/chat-shares.types';

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
    limit: number = SITEMAP_FEED_PAGE_SIZE,
    cursor: string | null = null,
  ): Promise<PublicChatSitemapEntry[]> {
    this.logger.debug(`listSitemapEntries: limit=${String(limit)}`);
    const cursorDate = cursor === null ? null : new Date(cursor);
    const shares = await this.shares.listIndexable(
      limit,
      cursorDate !== null && !Number.isNaN(cursorDate.getTime()) ? cursorDate : null,
    );
    return shares.map((share) => ({
      publicShareId: share.publicShareId,
      updatedAt: share.updatedAt.toISOString(),
    }));
  }
}
