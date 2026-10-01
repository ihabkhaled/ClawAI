import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { RunnerTokenGuard } from '../../../common/guards/runner-token.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import { RunnerService } from '../services/runner.service';
import { RunnerCredentialService } from '../services/runner-credential.service';
import { type CompleteCommandDto, completeCommandSchema } from '../dto/complete-command.dto';
import {
  type DispatchRunnerJobDto,
  dispatchRunnerJobSchema,
  type RegisterRunnerDto,
  registerRunnerSchema,
  type RunnerHeartbeatDto,
  runnerHeartbeatSchema,
} from '../dto/register-runner.dto';
import type {
  RegisterRunnerResult,
  RotatedRunnerCredential,
  RunnerResumeManifest,
  RunnerView,
} from '../types/runner.types';
import type { HeartbeatResult } from '../types/agent.types';
import type { TerminalCommand } from '../../../generated/prisma';
import type { AgentAuthContext, AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * F100 — self-hosted runners. Owner endpoints use the user JWT and scope every
 * read and write to the caller. The runner's own routes (heartbeat, claim,
 * complete) accept only the runner token issued at registration or rotation,
 * never a user JWT, device token or session key.
 */
@Controller('agent/runners')
export class AgentRunnerController {
  constructor(
    private readonly runners: RunnerService,
    private readonly credentials: RunnerCredentialService,
  ) {}

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

  /** F095: what a client reads before it continues a session on this runner. */
  @Get(':id/resume')
  async resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RunnerResumeManifest> {
    return this.runners.resumeManifest(id, user.id);
  }

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  async dispatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(dispatchRunnerJobSchema)) dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    return this.runners.dispatch(user.id, dto);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(RunnerTokenGuard)
  async heartbeat(
    @AgentSession() ctx: AgentAuthContext,
    @Body(new ZodValidationPipe(runnerHeartbeatSchema)) dto: RunnerHeartbeatDto,
  ): Promise<HeartbeatResult> {
    return this.runners.heartbeat(ctx.sessionId, ctx.userId, dto);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(RunnerTokenGuard)
  async claim(@AgentSession() ctx: AgentAuthContext): Promise<TerminalCommand[]> {
    return this.runners.claim(ctx.sessionId);
  }

  @Post('jobs/:commandId/complete')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(RunnerTokenGuard)
  async complete(
    @AgentSession() ctx: AgentAuthContext,
    @Param('commandId') commandId: string,
    @Body(new ZodValidationPipe(completeCommandSchema)) dto: CompleteCommandDto,
  ): Promise<TerminalCommand> {
    return this.runners.complete(ctx.sessionId, commandId, dto);
  }

  /** Shown once: the previous token stops working when this returns. */
  @Post(':id/credential/rotate')
  @HttpCode(HttpStatus.OK)
  async rotate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RotatedRunnerCredential> {
    return this.credentials.rotate(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.credentials.revoke(id, user.id);
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
