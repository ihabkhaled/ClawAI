import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AgentSessionService } from '../services/agent-session.service';
import { AgentKeyGuard } from '../../../common/guards/agent-key.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import {
  type CreateAgentSessionDto,
  createAgentSessionSchema,
} from '../dto/create-agent-session.dto';
import { type ListSessionsQueryDto, listSessionsQuerySchema } from '../dto/list-sessions-query.dto';
import type {
  AgentSessionWithCounts,
  HeartbeatResult,
  PaginatedAgentSessions,
  RegisterSessionResult,
} from '../types/agent.types';
import type { AgentAuthContext, AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/sessions')
export class AgentSessionController {
  constructor(private readonly service: AgentSessionService) {}

  @Post()
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAgentSessionSchema)) dto: CreateAgentSessionDto,
  ): Promise<RegisterSessionResult> {
    return this.service.register(user.id, dto);
  }

  @Get()
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSessionsQuerySchema)) query: ListSessionsQueryDto,
  ): Promise<PaginatedAgentSessions> {
    return this.service.getSessions(user.id, query);
  }

  @Get(':id')
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AgentSessionWithCounts> {
    return this.service.getSession(id, user.id);
  }

  @Delete(':id')
  async disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AgentSessionWithCounts> {
    return this.service.disconnect(id, user.id);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(AgentKeyGuard)
  async heartbeat(@AgentSession() ctx: AgentAuthContext): Promise<HeartbeatResult> {
    return this.service.heartbeat(ctx.sessionId);
  }
}
