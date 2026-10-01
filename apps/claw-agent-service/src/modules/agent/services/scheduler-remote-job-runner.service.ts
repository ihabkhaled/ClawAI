import { Injectable } from '@nestjs/common';
import { SchedulerManager } from '../managers/scheduler.manager';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import { RemoteJobRunner } from './remote-trigger.ports';
import type { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import type { ScheduledCommand, TerminalCommand } from '../../../generated/prisma';

/** The production runner: the timer's own fire path, reached on demand. */
@Injectable()
export class SchedulerRemoteJobRunner extends RemoteJobRunner {
  constructor(
    private readonly scheduled: ScheduledCommandRepository,
    private readonly commands: AgentCommandRepository,
    private readonly scheduler: SchedulerManager,
  ) {
    super();
  }

  async findOwned(userId: string, id: string): Promise<ScheduledCommand | null> {
    return this.scheduled.findByIdForUser(id, userId);
  }

  async fire(
    scheduled: ScheduledCommand,
    source: RoutineRunSource,
  ): Promise<TerminalCommand | null> {
    return this.scheduler.fireOne(scheduled, new Date(), source);
  }

  async findCommand(id: string): Promise<TerminalCommand | null> {
    return this.commands.findById(id);
  }
}
