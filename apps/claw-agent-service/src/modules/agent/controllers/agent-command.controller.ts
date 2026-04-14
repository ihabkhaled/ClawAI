import {
  Body,
  Controller,
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
import { AgentCommandService } from '../services/agent-command.service';
import { AgentCommandManager } from '../managers/agent-command.manager';
import { AgentKeyGuard } from '../../../common/guards/agent-key.guard';
import { AgentSession } from '../../../common/decorators/agent-session.decorator';
import { type CreateCommandDto, createCommandSchema } from '../dto/create-command.dto';
import { type ListCommandsQueryDto, listCommandsQuerySchema } from '../dto/list-commands-query.dto';
import { type RejectCommandDto, rejectCommandSchema } from '../dto/reject-command.dto';
import { type CompleteCommandDto, completeCommandSchema } from '../dto/complete-command.dto';
import type { PaginatedCommands } from '../types/agent.types';
import type { TerminalCommand } from '../../../generated/prisma';
import type { AgentAuthContext, AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/commands')
export class AgentCommandController {
  constructor(
    private readonly service: AgentCommandService,
    private readonly manager: AgentCommandManager,
  ) {}

  @Post()
  async createCommand(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCommandSchema)) dto: CreateCommandDto,
  ): Promise<TerminalCommand> {
    return this.service.createCommand(user.id, dto);
  }

  @Get()
  async listCommands(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCommandsQuerySchema)) query: ListCommandsQueryDto,
  ): Promise<PaginatedCommands> {
    return this.service.listCommands(user.id, query);
  }

  @Get('pending')
  @Public()
  @UseGuards(AgentKeyGuard)
  async getPending(@AgentSession() ctx: AgentAuthContext): Promise<TerminalCommand[]> {
    const commands = await this.service.getPendingForSession(ctx.sessionId);
    const started = await Promise.all(
      commands.map((cmd) => this.manager.startExecution(cmd.id, ctx.sessionId)),
    );
    return started.filter((c): c is TerminalCommand => c !== null);
  }

  @Get(':id')
  async getCommand(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TerminalCommand> {
    return this.service.getCommand(id, user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TerminalCommand> {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectCommandSchema)) dto: RejectCommandDto,
  ): Promise<TerminalCommand> {
    return this.service.reject(id, user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(AgentKeyGuard)
  async complete(
    @AgentSession() ctx: AgentAuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completeCommandSchema)) dto: CompleteCommandDto,
  ): Promise<TerminalCommand> {
    return this.service.complete(ctx.sessionId, id, dto);
  }
}
