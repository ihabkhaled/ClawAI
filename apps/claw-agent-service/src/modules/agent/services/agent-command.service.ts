import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { TerminalCommandStatus } from '../../../common/enums/terminal-command-status.enum';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import { COMMAND_EXPIRY_MS } from '../../../common/constants/agent.constants';
import type { CreateCommandDto } from '../dto/create-command.dto';
import type { ListCommandsQueryDto } from '../dto/list-commands-query.dto';
import type { RejectCommandDto } from '../dto/reject-command.dto';
import type { CompleteCommandDto } from '../dto/complete-command.dto';
import type { PaginatedCommands } from '../types/agent.types';
import type { TerminalCommand } from '../../../generated/prisma';

@Injectable()
export class AgentCommandService {
  private readonly logger = new Logger(AgentCommandService.name);

  constructor(
    private readonly commandRepo: AgentCommandRepository,
    private readonly sessionRepo: AgentSessionRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async createCommand(userId: string, dto: CreateCommandDto): Promise<TerminalCommand> {
    await this.assertSessionOwnership(dto.sessionId, userId);
    const expiresAt = new Date(Date.now() + COMMAND_EXPIRY_MS);
    const command = await this.commandRepo.create({
      session: { connect: { id: dto.sessionId } },
      userId,
      command: dto.command,
      workingDir: dto.workingDir,
      expiresAt,
    });
    void this.publishEvent(EventPattern.AGENT_COMMAND_REQUESTED, {
      commandId: command.id,
      sessionId: dto.sessionId,
      userId,
    });
    return command;
  }

  async listCommands(userId: string, query: ListCommandsQueryDto): Promise<PaginatedCommands> {
    return this.commandRepo.findAll(query, userId);
  }

  async getCommand(id: string, userId: string): Promise<TerminalCommand> {
    return this.getCommandRaw(id, userId);
  }

  async approve(id: string, userId: string): Promise<TerminalCommand> {
    const command = await this.getCommandRaw(id, userId);
    this.assertPending(command);
    const updated = await this.commandRepo.update(id, {
      status: TerminalCommandStatus.APPROVED,
      approvedAt: new Date(),
    });
    void this.publishEvent(EventPattern.AGENT_COMMAND_APPROVED, {
      commandId: id,
      sessionId: command.sessionId,
      userId,
    });
    return updated;
  }

  async reject(id: string, userId: string, dto: RejectCommandDto): Promise<TerminalCommand> {
    const command = await this.getCommandRaw(id, userId);
    this.assertPending(command);
    const updated = await this.commandRepo.update(id, {
      status: TerminalCommandStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: dto.reason,
    });
    void this.publishEvent(EventPattern.AGENT_COMMAND_REJECTED, {
      commandId: id,
      sessionId: command.sessionId,
      userId,
    });
    return updated;
  }

  async complete(
    sessionId: string,
    commandId: string,
    dto: CompleteCommandDto,
  ): Promise<TerminalCommand> {
    const command = await this.commandRepo.findById(commandId);
    if (command === null) throw new EntityNotFoundException('TerminalCommand', commandId);
    if (command.sessionId !== sessionId) {
      throw new BusinessException('agent.command.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    if (command.status !== TerminalCommandStatus.EXECUTING) {
      throw new BusinessException(
        'agent.command.not_executing',
        'INVALID_TRANSITION',
        HttpStatus.CONFLICT,
      );
    }
    const finalStatus =
      dto.exitCode === 0 ? TerminalCommandStatus.EXECUTED : TerminalCommandStatus.FAILED;
    const updated = await this.commandRepo.update(commandId, {
      status: finalStatus,
      stdout: dto.stdout,
      stderr: dto.stderr,
      exitCode: dto.exitCode,
      completedAt: new Date(),
    });
    void this.publishEvent(EventPattern.AGENT_COMMAND_COMPLETED, {
      commandId,
      sessionId,
      status: finalStatus,
    });
    return updated;
  }

  async getPendingForSession(sessionId: string): Promise<TerminalCommand[]> {
    return this.commandRepo.findApprovedForSession(sessionId);
  }

  private async getCommandRaw(id: string, userId: string): Promise<TerminalCommand> {
    const command = await this.commandRepo.findById(id);
    if (command === null) throw new EntityNotFoundException('TerminalCommand', id);
    if (command.userId !== userId) {
      throw new BusinessException('agent.command.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    return command;
  }

  private assertPending(command: TerminalCommand): void {
    if (command.status !== TerminalCommandStatus.PENDING_APPROVAL) {
      throw new BusinessException(
        'agent.command.not_pending',
        'ACTION_NOT_PENDING',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertSessionOwnership(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (session === null) throw new EntityNotFoundException('AgentSession', sessionId);
    if (session.userId !== userId) {
      throw new BusinessException('agent.session.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    if (session.status !== AgentSessionStatus.CONNECTED) {
      throw new BusinessException(
        'agent.session.not_connected',
        'SESSION_NOT_CONNECTED',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async publishEvent(
    pattern: EventPattern,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
