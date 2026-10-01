import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  COMMAND_EXPIRY_MS,
  SCHEDULER_DUE_BATCH_SIZE,
  SCHEDULER_TICK_MS,
} from '../../../common/constants/agent.constants';
import { resolveInitialStatus } from '../../../common/utilities/risk-status.utility';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import { CommandRiskService } from '../services/command-risk.service';
import { RunnerService } from '../services/runner.service';
import { nextRunForStoredCron } from '../../../common/utilities/cron-expression.utility';
import { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import { ScheduledCommandKind } from '../../../common/enums/scheduled-command-kind.enum';
import type { ScheduledCommand, TerminalCommand } from '../../../generated/prisma';

@Injectable()
export class SchedulerManager {
  private readonly logger = new Logger(SchedulerManager.name);

  constructor(
    private readonly scheduledRepo: ScheduledCommandRepository,
    private readonly commandRepo: AgentCommandRepository,
    private readonly sessionRepo: AgentSessionRepository,
    private readonly riskService: CommandRiskService,
    private readonly runners: RunnerService,
  ) {}

  @Interval(SCHEDULER_TICK_MS)
  async tick(): Promise<void> {
    const now = new Date();
    const due = await this.scheduledRepo.findDueForUser(now, SCHEDULER_DUE_BATCH_SIZE);
    if (due.length === 0) return;
    for (const scheduled of due) {
      try {
        await this.fireOne(scheduled, now);
      } catch (error) {
        this.logger.warn(
          `scheduled command ${scheduled.id} fire failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
  }

  /**
   * Fires one scheduled command now and advances its next run. Public so a
   * remote trigger (F029) runs exactly the path the timer runs. Null when
   * nothing can receive it now: no connected session on the device, or for a
   * PROMPT routine (F099) no live runner carrying its labels.
   */
  async fireOne(
    scheduled: ScheduledCommand,
    now: Date,
    source: RoutineRunSource = RoutineRunSource.SCHEDULE,
  ): Promise<TerminalCommand | null> {
    if (scheduled.kind === ScheduledCommandKind.PROMPT) {
      return this.firePrompt(scheduled, now, source);
    }
    if (scheduled.deviceId === null) {
      this.logger.warn(`scheduled ${scheduled.id}: command routine without a device; skipped`);
      return null;
    }
    const sessions = await this.sessionRepo.findConnectedForDevice(scheduled.deviceId);
    const session = sessions[0];
    if (session === undefined) {
      this.logger.debug(
        `scheduled ${scheduled.id}: no connected session for device ${scheduled.deviceId}; deferring`,
      );
      return null;
    }
    const assessment = await this.riskService.assess(scheduled.command);
    const expiresAt = new Date(Date.now() + COMMAND_EXPIRY_MS);
    const status = resolveInitialStatus(assessment);
    const created = await this.commandRepo.create({
      session: { connect: { id: session.id } },
      userId: scheduled.userId,
      command: scheduled.command,
      workingDir: scheduled.workingDir,
      expiresAt,
      status,
      approvedAt: assessment.autoApproved && !assessment.blockedByPolicy ? new Date() : null,
      rejectedAt: assessment.blockedByPolicy ? new Date() : null,
      rejectionReason: assessment.blockedByPolicy
        ? `Blocked by policy "${assessment.matchedPolicyName ?? 'unknown'}"`
        : null,
      riskScore: assessment.riskScore,
      riskLabel: assessment.riskLabel,
      matchedPolicy:
        assessment.matchedPolicyId === null
          ? undefined
          : { connect: { id: assessment.matchedPolicyId } },
      riskReasons: assessment.reasons.length > 0 ? assessment.reasons.join(' | ') : null,
      autoApproved: assessment.autoApproved && !assessment.blockedByPolicy,
      blockedByPolicy: assessment.blockedByPolicy,
    });
    const nextRunAt = new Date(now.getTime() + scheduled.intervalMinutes * 60 * 1000);
    await this.scheduledRepo.markRun(scheduled.id, created.id, nextRunAt);
    this.logger.log(`scheduled ${scheduled.id} fired → command ${created.id} (status=${status})`);
    return created;
  }

  /**
   * A cron routine's next slot after now (UTC); anything else, or a stored
   * expression that no longer yields a date, keeps the fixed interval so the
   * routine cannot become due on every tick.
   */
  private nextRunFor(scheduled: ScheduledCommand, now: Date): Date {
    const next =
      typeof scheduled.cron === 'string'
        ? nextRunForStoredCron(scheduled.cron, now.getTime())
        : undefined;
    return new Date(next ?? now.getTime() + scheduled.intervalMinutes * 60 * 1000);
  }

  private async firePrompt(
    scheduled: ScheduledCommand,
    now: Date,
    source: RoutineRunSource,
  ): Promise<TerminalCommand | null> {
    const created = await this.runners.dispatchPrompt(scheduled, source);
    if (created === null) {
      this.logger.debug(`scheduled ${scheduled.id}: no live runner matches its labels; deferring`);
      return null;
    }
    const nextRunAt = this.nextRunFor(scheduled, now);
    await this.scheduledRepo.markRun(scheduled.id, created.id, nextRunAt);
    this.logger.log(`prompt routine ${scheduled.id} fired → runner job ${created.id}`);
    return created;
  }
}
