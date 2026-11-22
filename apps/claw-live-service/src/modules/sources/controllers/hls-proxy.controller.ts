import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';
import type { Response } from 'express';

import { HlsProxyService } from '../services/hls-proxy.service';
import type { HlsProxyReply } from '../types/hls-proxy.types';

/** `GET /api/v1/live/streams/:streamId/hls/*` — same-origin, session-bound HLS proxy. */
@Controller('live/streams')
export class HlsProxyController {
  constructor(private readonly proxy: HlsProxyService) {}

  @Get(':streamId/hls/p')
  async proxied(
    @Param('streamId') streamId: string,
    @Query('u') encoded: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    this.send(response, await this.proxy.proxied(streamId, user.id, encoded));
  }

  @Get(':streamId/hls/:file')
  async file(
    @Param('streamId') streamId: string,
    @Param('file') file: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    this.send(response, await this.proxy.file(streamId, user.id, file));
  }

  private send(response: Response, reply: HlsProxyReply): void {
    response.status(200);
    response.setHeader('content-type', reply.contentType);
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    reply.body.pipe(response);
  }
}
