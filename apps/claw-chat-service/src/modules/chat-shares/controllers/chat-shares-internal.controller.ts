import { Controller, Get, Query } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type SitemapFeedQueryDto, sitemapFeedQuerySchema } from '../dto/chat-share.dto';
import { PublicChatShareService } from '../services/public-chat-share.service';
import { type PublicChatSitemapEntry } from '../types/chat-shares.types';

/**
 * The sitemap feed the frontend reads when building its dynamic sitemap.
 *
 * Exists so the frontend never queries the chat database directly. It returns
 * only an identifier and a timestamp — a sitemap is a public document, and a
 * title or a thread id in it would publish more than the URL itself does.
 */
@Controller('internal/chat-shares')
@Public()
export class ChatSharesInternalController {
  constructor(private readonly shares: PublicChatShareService) {}

  @Get('sitemap-feed')
  async listSitemapEntries(
    @Query(new ZodValidationPipe(sitemapFeedQuerySchema)) query: SitemapFeedQueryDto,
  ): Promise<PublicChatSitemapEntry[]> {
    return this.shares.listSitemapEntries(query.limit, query.cursor ?? null);
  }
}
