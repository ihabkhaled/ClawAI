import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type ResolveSourceBody, resolveSourceBodySchema } from '../dto/live-session.dto';
import { LiveSessionsService } from '../services/live-sessions.service';
import type { LiveSourceResolutionView } from '../types/live-session.types';

@Controller('live/sources')
export class LiveSourcesController {
  constructor(private readonly sessions: LiveSessionsService) {}

  /** What the UI can do with a pasted URL. Writes nothing. */
  @Post('resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(resolveSourceBodySchema)) body: ResolveSourceBody,
  ): Promise<LiveSourceResolutionView> {
    return this.sessions.resolve(body.url, user.id);
  }
}
