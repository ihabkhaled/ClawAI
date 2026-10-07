import { Controller, Header, HttpCode, Ip, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';
import type { Request } from 'express';

import {
  VIEW_RATE_LIMIT_PER_MINUTE,
  VIEW_RATE_LIMIT_WINDOW_MS,
} from '../constants/publication-view.constants';
import { clientAddress, userAgentOf } from '../utilities/publication-request.utility';
import { PublicationViewsService } from '../services/publication-views.service';

@Controller('thread-publications/public/:slug')
export class PublicationViewsController {
  constructor(private readonly views: PublicationViewsService) {}

  /** A visitor who is not signed in. */
  @Public()
  @Post('view')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: VIEW_RATE_LIMIT_PER_MINUTE, ttl: VIEW_RATE_LIMIT_WINDOW_MS } })
  recordAnonymousView(
    @Param('slug') slug: string,
    @Req() request: Request,
    @Ip() ip: string,
  ): ReturnType<PublicationViewsService['record']> {
    return this.views.record(slug, {
      ip: clientAddress(request, ip),
      userAgent: userAgentOf(request),
      userId: null,
    });
  }

  /** A signed-in reader: counted once as a distinct reader as well. */
  @Post('reader-view')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: VIEW_RATE_LIMIT_PER_MINUTE, ttl: VIEW_RATE_LIMIT_WINDOW_MS } })
  recordReaderView(
    @Param('slug') slug: string,
    @Req() request: Request,
    @Ip() ip: string,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationViewsService['record']> {
    return this.views.record(slug, {
      ip: clientAddress(request, ip),
      userAgent: userAgentOf(request),
      userId: user.id,
    });
  }
}
