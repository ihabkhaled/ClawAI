import { Controller, Get, Header, HttpCode, HttpStatus, Param } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { PUBLIC_SHARE_CACHE_CONTROL } from '../constants/public-cache.constants';
import { type PublicShareParamDto, publicShareParamSchema } from '../dto/chat-share.dto';
import { PublicChatShareService } from '../services/public-chat-share.service';
import { type PublicChatShareResponse } from '../types/chat-shares.types';

/**
 * The unauthenticated read surface. GET only.
 *
 * There is deliberately no POST, PATCH, PUT or DELETE here — a viewing surface
 * that can be written to is not a viewing surface. Nest returns 404 for the
 * undefined verbs, which is also the right answer for a crawler probing them.
 *
 * The global throttler applies here deliberately — this is the one endpoint a
 * stranger can hit at will, so it keeps the default rate limit rather than
 * opting out of it.
 *
 * Responses are `no-store`. Immediate privacy beats cache efficiency: when an
 * owner revokes a share, the page must stop resolving now, not when a CDN
 * decides to revalidate. Caching can be tightened later once invalidation is
 * proven; the wrong order would leave revoked conversations served from a cache.
 */
@Controller('public/chat-shares')
@Public()
export class PublicChatSharesController {
  constructor(private readonly shares: PublicChatShareService) {}

  @Get(':publicShareId')
  @Header('Cache-Control', PUBLIC_SHARE_CACHE_CONTROL)
  // An unlisted share is reachable by URL but must never be indexed. The header
  // backs up the page-level metadata, so a crawler that fetches the API
  // directly gets the same instruction.
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param(new ZodValidationPipe(publicShareParamSchema)) params: PublicShareParamDto,
  ): Promise<PublicChatShareResponse> {
    // The service raises one uniform 404 for private, revoked, deleted and
    // never-existed, so nothing here can distinguish them.
    return this.shares.requirePublic(params.publicShareId);
  }
}
