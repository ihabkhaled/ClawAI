import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';
import type { Request } from 'express';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { liveSessionIdSchema } from '../../realtime/dto/live-session-param.dto';
import {
  type ApproveCreditsBody,
  approveCreditsBodySchema,
  type CreateSessionBody,
  createSessionBodySchema,
  type HeartbeatBody,
  heartbeatBodySchema,
  type UpdateSessionBody,
  updateSessionBodySchema,
} from '../dto/live-session.dto';
import { LiveSessionsService } from '../services/live-sessions.service';
import type {
  LiveCloseView,
  LiveHeartbeatView,
  LiveSessionCreatedView,
  LiveSessionStateView,
} from '../types/live-session.types';

@Controller('live/sessions')
export class LiveSessionsController {
  constructor(private readonly sessions: LiveSessionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createSessionBodySchema)) body: CreateSessionBody,
  ): Promise<LiveSessionCreatedView> {
    return this.sessions.create(user.id, body);
  }

  @Post(':sessionId/heartbeat')
  @HttpCode(200)
  heartbeat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @Body(new ZodValidationPipe(heartbeatBodySchema)) body: HeartbeatBody,
  ): Promise<LiveHeartbeatView> {
    return this.sessions.heartbeat(sessionId, user.id, body);
  }

  @Post(':sessionId/approve-credits')
  @HttpCode(200)
  approveCredits(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @Body(new ZodValidationPipe(approveCreditsBodySchema)) body: ApproveCreditsBody,
  ): Promise<LiveSessionStateView> {
    return this.sessions.approveCredits(sessionId, user.id, body);
  }

  @Patch(':sessionId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @Body(new ZodValidationPipe(updateSessionBodySchema)) body: UpdateSessionBody,
  ): Promise<LiveSessionStateView> {
    return this.sessions.update(sessionId, user.id, body);
  }

  @Delete(':sessionId')
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
  ): Promise<LiveSessionStateView> {
    return this.sessions.close(sessionId, user.id);
  }

  /**
   * navigator.sendBeacon close. Public because a beacon cannot carry the Bearer
   * header; the short-lived signed close token in the body is checked instead.
   */
  @Public()
  @Post(':sessionId/close')
  @HttpCode(200)
  closeByBeacon(
    @Param('sessionId', new ZodValidationPipe(liveSessionIdSchema)) sessionId: string,
    @Req() request: Request,
  ): Promise<LiveCloseView> {
    return this.sessions.closeWithToken(sessionId, request);
  }
}
