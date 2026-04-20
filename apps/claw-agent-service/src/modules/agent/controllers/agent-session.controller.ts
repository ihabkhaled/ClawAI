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
import { CompatAgentGuard } from '../../../common/guards/compat-agent.guard';
import { DeviceAccessGuard } from '../../../common/guards/device-access.guard';
import { ScopeGuard } from '../../../common/guards/scope.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import { CurrentDevice } from '../../../common/decorators/current-device.decorator';
import { RequireScopes } from '../../../common/decorators/require-scopes.decorator';
import { DeviceScope } from '../../../common/enums/device-scope.enum';
import {
  type CreateAgentSessionDto,
  createAgentSessionSchema,
} from '../dto/create-agent-session.dto';
import { type ListSessionsQueryDto, listSessionsQuerySchema } from '../dto/list-sessions-query.dto';
import { type AttachSessionDto, attachSessionSchema } from '../dto/attach-session.dto';
import type {
  AgentSessionWithCounts,
  AttachSessionResult,
  HeartbeatResult,
  PaginatedAgentSessions,
  RegisterSessionResult,
} from '../types/agent.types';
import type {
  AgentAuthContext,
  AuthenticatedUser,
  DeviceContext,
} from '../../../common/types/auth.types';

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

  @Post('attach')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(DeviceAccessGuard, ScopeGuard)
  @RequireScopes(DeviceScope.SESSIONS_READ)
  async attach(
    @CurrentDevice() device: DeviceContext,
    @Body(new ZodValidationPipe(attachSessionSchema)) dto: AttachSessionDto,
  ): Promise<AttachSessionResult> {
    return this.service.attachDevice(device, dto);
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
  @UseGuards(CompatAgentGuard)
  async heartbeat(@AgentSession() ctx: AgentAuthContext): Promise<HeartbeatResult> {
    return this.service.heartbeat(ctx.sessionId);
  }
}
