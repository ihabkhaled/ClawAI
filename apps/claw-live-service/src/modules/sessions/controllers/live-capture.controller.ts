import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { liveSessionIdSchema } from '../../realtime/dto/live-session-param.dto';
import { LIVE_CAPTURE_START_HEADER } from '../constants/live-capture.constants';
import { LiveCaptureService } from '../services/live-capture.service';
import type { LiveCaptureAcceptedView } from '../types/live-capture.types';

@Controller('live/sessions')
export class LiveCaptureController {
  constructor(private readonly capture: LiveCaptureService) {}

  /**
   * One tab-audio chunk from the viewer's own browser (raw `audio/wav`, at most 400 KB; the
   * raw parser is mounted for this path only in main.ts). 202 once queued for the run.
   */
  @Post(':sessionId/audio')
  @HttpCode(202)
  audio(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @Headers(LIVE_CAPTURE_START_HEADER) startAt: string | undefined,
    @Body() body: unknown,
  ): Promise<LiveCaptureAcceptedView> {
    return this.capture.ingest(sessionId, user.id, body, startAt);
  }
}
