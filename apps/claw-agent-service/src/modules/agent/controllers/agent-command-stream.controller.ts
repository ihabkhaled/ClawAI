import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CompatAgentGuard } from '../../../common/guards/compat-agent.guard';
import { ScopeGuard } from '../../../common/guards/scope.guard';
import { RequireScopes } from '../../../common/decorators/require-scopes.decorator';
import { DeviceScope } from '../../../common/enums/device-scope.enum';
import { CommandStreamService } from '../services/command-stream.service';
import { AgentCommandService } from '../services/agent-command.service';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import {
  STREAM_SSE_MAX_IDLE_POLLS,
  STREAM_SSE_POLL_INTERVAL_MS,
} from '../../../common/constants/stream.constants';
import { TerminalCommandStatus } from '../../../common/enums/terminal-command-status.enum';
import { type PushChunksDto, pushChunksSchema } from '../dto/push-chunks.dto';
import { type CancelCommandDto, cancelCommandSchema } from '../dto/cancel-command.dto';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { TerminalCommand } from '../../../generated/prisma';

@Controller('agent/commands')
export class AgentCommandStreamController {
  constructor(
    private readonly streamService: CommandStreamService,
    private readonly commandService: AgentCommandService,
    private readonly commandRepo: AgentCommandRepository,
  ) {}

  @Post(':id/chunks')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(CompatAgentGuard, ScopeGuard)
  @RequireScopes(DeviceScope.SHELL_EXEC)
  async pushChunks(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pushChunksSchema)) dto: PushChunksDto,
  ): Promise<{ total: number; cancelRequested: boolean }> {
    const total = await this.streamService.appendChunks(
      id,
      dto.chunks.map((c) => ({
        type: c.type,
        data: c.data,
        timestamp: c.timestamp ?? new Date().toISOString(),
      })),
    );
    const cancelRequested = await this.streamService.isCancelRequested(id);
    return { total, cancelRequested };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelCommandSchema)) dto: CancelCommandDto,
  ): Promise<TerminalCommand> {
    return this.commandService.cancel(id, user.id, dto);
  }

  @Post(':id/stream')
  async stream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const command = await this.commandRepo.findById(id);
    if (command?.userId !== user.id) {
      response.status(HttpStatus.NOT_FOUND).json({ code: 'command_not_found' });
      return;
    }
    response.setHeader('content-type', 'text/event-stream');
    response.setHeader('cache-control', 'no-cache, no-transform');
    response.setHeader('connection', 'keep-alive');
    response.setHeader('x-accel-buffering', 'no');
    response.flushHeaders();
    let lastSeq = 0;
    let idlePolls = 0;
    let active = true;
    request.on('close', () => {
      active = false;
    });
    while (active && idlePolls < STREAM_SSE_MAX_IDLE_POLLS) {
      const chunks = await this.streamService.readChunks(id, lastSeq);
      if (chunks.length > 0) {
        idlePolls = 0;
        for (const chunk of chunks) {
          response.write(`data: ${JSON.stringify(chunk)}\n\n`);
          lastSeq = chunk.seq;
        }
      } else {
        idlePolls += 1;
      }
      const refreshed = await this.commandRepo.findById(id);
      if (refreshed !== null && this.isTerminal(refreshed.status as TerminalCommandStatus)) {
        response.write(
          `event: end\ndata: ${JSON.stringify({ status: refreshed.status, exitCode: refreshed.exitCode })}\n\n`,
        );
        active = false;
        break;
      }
      await new Promise((r) => setTimeout(r, STREAM_SSE_POLL_INTERVAL_MS));
    }
    response.end();
  }

  private isTerminal(status: TerminalCommandStatus): boolean {
    return (
      status === TerminalCommandStatus.EXECUTED ||
      status === TerminalCommandStatus.FAILED ||
      status === TerminalCommandStatus.CANCELLED ||
      status === TerminalCommandStatus.EXPIRED ||
      status === TerminalCommandStatus.REJECTED
    );
  }
}
