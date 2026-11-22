import { Controller, Get, Headers, Param, Req, Res } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { liveSessionIdSchema } from '../dto/live-session-param.dto';
import { LiveSseManager } from '../managers/live-sse.manager';

@Controller('live/sessions')
export class LiveStreamController {
  constructor(private readonly sse: LiveSseManager) {}

  /** SSE: caption/card/highlight/status/usage events of the session's run, Last-Event-ID replay. */
  @Get(':sessionId/stream')
  @SkipThrottle()
  async stream(
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('last-event-id') lastEventId: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.sse.open(sessionId, user.id, lastEventId, request, response);
  }
}
