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
import type { ScheduledCommand } from '../../../generated/prisma';

@Injectable()
export class SchedulerManager {
  private readonly logger = new Logger(SchedulerManager.name);

  constructor(
    private readonly scheduledRepo: ScheduledCommandRepository,
    private readonly commandRepo: AgentCommandRepository,
    private readonly sessionRepo: AgentSessionRepository,
    private readonly riskService: CommandRiskService,
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

  private async fireOne(scheduled: ScheduledCommand, now: Date): Promise<void> {
    const sessions = await this.sessionRepo.findConnectedForDevice(scheduled.deviceId);
    const session = sessions[0];
    if (session === undefined) {
      this.logger.debug(
        `scheduled ${scheduled.id}: no connected session for device ${scheduled.deviceId}; deferring`,
      );
      return;
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
  }
}
