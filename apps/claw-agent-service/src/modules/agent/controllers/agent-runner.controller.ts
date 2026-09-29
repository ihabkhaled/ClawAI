import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CompatAgentGuard } from '../../../common/guards/compat-agent.guard';
import { ScopeGuard } from '../../../common/guards/scope.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import { RequireScopes } from '../../../common/decorators/require-scopes.decorator';
import { DeviceScope } from '../../../common/enums/device-scope.enum';
import { RunnerService } from '../services/runner.service';
import {
  type DispatchRunnerJobDto,
  dispatchRunnerJobSchema,
  type RegisterRunnerDto,
  registerRunnerSchema,
} from '../dto/register-runner.dto';
import type { RegisterRunnerResult, RunnerView } from '../types/runner.types';
import type { TerminalCommand } from '../../../generated/prisma';
import type { AgentAuthContext, AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * F100 — self-hosted runners. Owner endpoints use the user JWT and scope every
 * read and write to the caller. The runner authenticates with the session key
 * it received at registration: heartbeat stays on the session heartbeat route
 * and results on the command complete route.
 */
@Controller('agent/runners')
export class AgentRunnerController {
  constructor(private readonly runners: RunnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerRunnerSchema)) dto: RegisterRunnerDto,
  ): Promise<RegisterRunnerResult> {
    return this.runners.register(user.id, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<RunnerView[]> {
    return this.runners.list(user.id);
  }

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  async dispatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(dispatchRunnerJobSchema)) dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    return this.runners.dispatch(user.id, dto);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(CompatAgentGuard, ScopeGuard)
  @RequireScopes(DeviceScope.SHELL_EXEC)
  async claim(@AgentSession() ctx: AgentAuthContext): Promise<TerminalCommand[]> {
    return this.runners.claim(ctx.sessionId);
  }

  @Post(':id/jobs')
  @HttpCode(HttpStatus.CREATED)
  async dispatchTo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(dispatchRunnerJobSchema)) dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    return this.runners.dispatchTo(id, user.id, dto);
  }
}
