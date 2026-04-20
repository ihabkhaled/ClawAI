import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AgentEventService } from '../services/agent-event.service';
import { CompatAgentGuard } from '../../../common/guards/compat-agent.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import { type CreateFileEventsDto, createFileEventsSchema } from '../dto/create-file-events.dto';
import { type ListEventsQueryDto, listEventsQuerySchema } from '../dto/list-events-query.dto';
import type { PaginatedFileEvents, ReportEventsResult } from '../types/agent.types';
import type { AgentAuthContext, AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/events')
export class AgentEventController {
  constructor(private readonly service: AgentEventService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(CompatAgentGuard)
  async reportEvents(
    @AgentSession() ctx: AgentAuthContext,
    @Body(new ZodValidationPipe(createFileEventsSchema)) dto: CreateFileEventsDto,
  ): Promise<ReportEventsResult> {
    return this.service.reportEvents(ctx.sessionId, ctx.userId, dto);
  }

  @Get()
  async listEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listEventsQuerySchema)) query: ListEventsQueryDto,
  ): Promise<PaginatedFileEvents> {
    return this.service.listEvents(user.id, query);
  }
}
