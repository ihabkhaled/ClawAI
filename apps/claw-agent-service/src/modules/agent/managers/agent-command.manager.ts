import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import {
  CLEANUP_INTERVAL_MS,
  STUCK_EXECUTING_TIMEOUT_MS,
} from '../../../common/constants/agent.constants';
import type { TerminalCommand } from '../../../generated/prisma';

@Injectable()
export class AgentCommandManager {
  private readonly logger = new Logger(AgentCommandManager.name);

  constructor(private readonly repository: AgentCommandRepository) {}

  async startExecution(commandId: string, sessionId: string): Promise<TerminalCommand | null> {
    return this.repository.tryStartExecution(commandId, sessionId);
  }

  @Interval(CLEANUP_INTERVAL_MS)
  async expireStaleCommands(): Promise<void> {
    const count = await this.repository.expireStaleCommands(new Date());
    if (count > 0) this.logger.log(`Expired ${count} stale command(s)`);
  }

  @Interval(CLEANUP_INTERVAL_MS)
  async resetStuckExecuting(): Promise<void> {
    const cutoff = new Date(Date.now() - STUCK_EXECUTING_TIMEOUT_MS);
    const count = await this.repository.resetStuckExecuting(cutoff);
    if (count > 0) this.logger.warn(`Reset ${count} stuck-executing command(s) to FAILED`);
  }
}
