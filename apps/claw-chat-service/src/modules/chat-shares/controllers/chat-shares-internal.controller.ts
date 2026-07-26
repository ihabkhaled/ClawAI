import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RssFeedQueryDto,
  rssFeedQuerySchema,
  type SitemapCountQueryDto,
  sitemapCountQuerySchema,
  type SitemapFeedQueryDto,
  sitemapFeedQuerySchema,
} from '../dto/chat-share.dto';
import { PublicChatShareService } from '../services/public-chat-share.service';
import type {
  PublicChatRssEntry,
  PublicChatSitemapCount,
  PublicChatSitemapPage,
} from '../types/chat-share-discovery.types';

/**
 * The sitemap feed the frontend reads when building its dynamic sitemap.
 *
 * Exists so the frontend never queries the chat database directly. It returns
 * only an identifier and a timestamp — a sitemap is a public document, and a
 * title or a thread id in it would publish more than the URL itself does.
 */
@Controller('internal/chat-shares')
@Public()
@UseGuards(ServiceTokenGuard)
export class ChatSharesInternalController {
  constructor(private readonly shares: PublicChatShareService) {}

  @Get('sitemap-feed')
  async listSitemapEntries(
    @Query(new ZodValidationPipe(sitemapFeedQuerySchema)) query: SitemapFeedQueryDto,
  ): Promise<PublicChatSitemapPage> {
    return this.shares.listSitemapEntries(query.locale, query.limit, query.cursor ?? null);
  }

  @Get('sitemap-count')
  async countSitemapEntries(
    @Query(new ZodValidationPipe(sitemapCountQuerySchema)) query: SitemapCountQueryDto,
  ): Promise<PublicChatSitemapCount> {
    return this.shares.countSitemapEntries(query.locale);
  }

  @Get('rss-feed')
  async listRssEntries(
    @Query(new ZodValidationPipe(rssFeedQuerySchema)) query: RssFeedQueryDto,
  ): Promise<PublicChatRssEntry[]> {
    return this.shares.listRssEntries(query.locale, query.limit);
  }
}
