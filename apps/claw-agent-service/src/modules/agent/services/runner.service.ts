import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import { RunnerApprovalPolicy } from '../../../common/enums/runner-approval-policy.enum';
import { TerminalCommandKind } from '../../../common/enums/terminal-command-kind.enum';
import { TerminalCommandStatus } from '../../../common/enums/terminal-command-status.enum';
import {
  COMMAND_EXPIRY_MS,
  SESSION_HEARTBEAT_TIMEOUT_SECONDS,
} from '../../../common/constants/agent.constants';
import {
  PROMPT_JOB_APPROVAL_NOTE,
  RUNNER_CLAIM_LIMIT,
  RUNNER_HEARTBEAT_TTL_SECONDS,
  RUNNER_METADATA_KIND,
} from '../constants/runner.constants';
import { RunnerRepository } from '../repositories/runner.repository';
import { RunnerCredentialRepository } from '../repositories/runner-credential.repository';
import { AgentCommandRepository } from '../repositories/agent-command.repository';
import { AgentCommandManager } from '../managers/agent-command.manager';
import { AgentSessionService } from './agent-session.service';
import { AgentCommandService } from './agent-command.service';
import { RunnerCredentialService } from './runner-credential.service';
import type {
  DispatchRunnerJobDto,
  RegisterRunnerDto,
  RunnerHeartbeatDto,
} from '../dto/register-runner.dto';
import type { CompleteCommandDto } from '../dto/complete-command.dto';
import type {
  RegisterRunnerResult,
  RunnerMetadata,
  RunnerRow,
  RunnerView,
} from '../types/runner.types';
import type { HeartbeatResult } from '../types/agent.types';
import type { ScheduledCommand, TerminalCommand } from '../../../generated/prisma';

/**
 * F100 — self-hosted runners.
 *
 * A runner is an owner-scoped agent session marked `kind: runner`, holding its
 * own credential (see RunnerCredentialService). Shell jobs are ordinary
 * TerminalCommands, so the policy engine scores every dispatched job exactly
 * as it scores a command typed in the portal. A runner whose heartbeat is
 * older than RUNNER_HEARTBEAT_TTL_SECONDS gets no new job and claims nothing.
 */
@Injectable()
export class RunnerService {
  private readonly logger = new Logger(RunnerService.name);

  constructor(
    private readonly runners: RunnerRepository,
    private readonly credentials: RunnerCredentialRepository,
    private readonly credentialService: RunnerCredentialService,
    private readonly sessions: AgentSessionService,
    private readonly commands: AgentCommandService,
    private readonly commandRepo: AgentCommandRepository,
    private readonly commandManager: AgentCommandManager,
  ) {}

  /**
   * The session key the session layer mints is discarded: a runner never
   * receives it, so the only credential that reaches a runner is its own.
   */
  async register(userId: string, dto: RegisterRunnerDto): Promise<RegisterRunnerResult> {
    const metadata: RunnerMetadata = {
      kind: RUNNER_METADATA_KIND,
      name: dto.name,
      labels: [...new Set(dto.labels)],
      approvalPolicy: dto.approvalPolicy,
    };
    const session = await this.sessions.register(userId, {
      hostname: dto.hostname,
      platform: dto.platform,
      agentVersion: dto.agentVersion,
      metadata,
    });
    const issued = await this.credentialService.issue(session.id, userId);
    return {
      runnerId: session.id,
      runnerToken: issued.token,
      tokenPrefix: issued.tokenPrefix,
      approvalPolicy: dto.approvalPolicy,
      heartbeatIntervalSeconds: SESSION_HEARTBEAT_TIMEOUT_SECONDS / 2,
    };
  }

  async list(userId: string): Promise<RunnerView[]> {
    const rows = await this.runners.listConnected(userId, this.freshSince());
    return rows.map((row) => this.toView(row));
  }

  async dispatchTo(
    runnerId: string,
    userId: string,
    dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    const runner = await this.runners.findOwned(runnerId, userId);
    if (runner === null) throw new EntityNotFoundException('Runner', runnerId);
    if (!this.isLive(runner)) {
      throw new BusinessException('agent.runner.offline', 'RUNNER_OFFLINE', HttpStatus.CONFLICT);
    }
    return this.enqueue(runner.id, userId, dto);
  }

  /** Placement: the most recently seen live runner carrying every label. */
  async dispatch(userId: string, dto: DispatchRunnerJobDto): Promise<TerminalCommand> {
    const target = await this.pick(userId, dto.labels);
    if (target === undefined) {
      throw new BusinessException(
        'agent.runner.none_available',
        'NO_RUNNER_AVAILABLE',
        HttpStatus.CONFLICT,
      );
    }
    return this.enqueue(target.id, userId, dto);
  }

  /**
   * F099: queue a due PROMPT routine on one of its owner's live runners.
   * Null when none carries every label; the scheduler retries on its next
   * tick. The job is queued APPROVED because the portal cannot judge a
   * prompt: every tool call it makes is approved on the runner instead.
   */
  async dispatchPrompt(scheduled: ScheduledCommand): Promise<TerminalCommand | null> {
    const target = await this.pick(scheduled.userId, scheduled.runnerLabels);
    if (target === undefined) return null;
    const now = new Date();
    return this.commandRepo.create({
      session: { connect: { id: target.id } },
      userId: scheduled.userId,
      kind: TerminalCommandKind.PROMPT,
      command: scheduled.command,
      model: scheduled.model,
      repoRef: scheduled.repoRef,
      status: TerminalCommandStatus.APPROVED,
      approvedAt: now,
      riskReasons: PROMPT_JOB_APPROVAL_NOTE,
      expiresAt: new Date(now.getTime() + COMMAND_EXPIRY_MS),
    });
  }

  /**
   * Revives an EXPIRED runner; a revoked (DISCONNECTED) one answers 409.
   * The optional report (F100) updates the recorded version and platform only;
   * it is self-reported and unsigned, so nothing decides access from it.
   */
  async heartbeat(sessionId: string, report?: RunnerHeartbeatDto): Promise<HeartbeatResult> {
    const revived = await this.runners.touchHeartbeat(sessionId, report ?? {});
    if (revived === 0) {
      throw new BusinessException('agent.runner.offline', 'RUNNER_OFFLINE', HttpStatus.CONFLICT);
    }
    await this.credentials.touch(sessionId);
    return { ok: true, nextHeartbeatInSeconds: SESSION_HEARTBEAT_TIMEOUT_SECONDS / 2 };
  }

  /**
   * Claim at most one approved job addressed to the calling runner. A stale
   * runner claims nothing until it heartbeats again. The APPROVED to
   * EXECUTING transition is a guarded update, so two processes holding the
   * same token cannot both claim one job.
   */
  async claim(sessionId: string): Promise<TerminalCommand[]> {
    const runner = await this.runners.findById(sessionId);
    if (runner === null || !this.isLive(runner)) {
      this.logger.debug(`runner ${sessionId} is not live; nothing claimed`);
      return [];
    }
    const pending = await this.commands.getPendingForSession(sessionId);
    const claimed: TerminalCommand[] = [];
    for (const command of pending) {
      if (claimed.length >= RUNNER_CLAIM_LIMIT) break;
      const started = await this.commandManager.startExecution(command.id, sessionId);
      if (started !== null) claimed.push(started);
    }
    return claimed;
  }

  /** A runner reports only jobs addressed to it; anything else is 403. */
  async complete(
    sessionId: string,
    commandId: string,
    dto: CompleteCommandDto,
  ): Promise<TerminalCommand> {
    return this.commands.complete(sessionId, commandId, dto);
  }

  private async pick(userId: string, labels: string[]): Promise<RunnerRow | undefined> {
    const rows = await this.runners.listConnected(userId, this.freshSince());
    return rows.find((row) => this.hasLabels(row, labels));
  }

  private enqueue(
    sessionId: string,
    userId: string,
    dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    return this.commands.createCommand(userId, {
      sessionId,
      command: dto.command,
      ...(dto.workingDir === undefined ? {} : { workingDir: dto.workingDir }),
    });
  }

  private freshSince(): Date {
    return new Date(Date.now() - RUNNER_HEARTBEAT_TTL_SECONDS * 1000);
  }

  private isLive(row: RunnerRow): boolean {
    return (
      row.status === AgentSessionStatus.CONNECTED &&
      row.lastHeartbeatAt !== null &&
      row.lastHeartbeatAt.getTime() >= this.freshSince().getTime()
    );
  }

  private hasLabels(row: RunnerRow, required: string[]): boolean {
    const labels = new Set(this.metadataOf(row).labels);
    return required.every((label) => labels.has(label));
  }

  private metadataOf(row: RunnerRow): RunnerMetadata {
    const raw = row.metadata;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        kind: RUNNER_METADATA_KIND,
        name: row.hostname,
        labels: [],
        approvalPolicy: RunnerApprovalPolicy.ASK,
      };
    }
    const name = typeof raw['name'] === 'string' ? raw['name'] : row.hostname;
    const rawLabels = raw['labels'];
    const labels = Array.isArray(rawLabels)
      ? rawLabels.filter((label): label is string => typeof label === 'string')
      : [];
    const approvalPolicy =
      raw['approvalPolicy'] === RunnerApprovalPolicy.AUTO_APPROVE_READ_ONLY
        ? RunnerApprovalPolicy.AUTO_APPROVE_READ_ONLY
        : RunnerApprovalPolicy.ASK;
    return { kind: RUNNER_METADATA_KIND, name, labels, approvalPolicy };
  }

  private toView(row: RunnerRow): RunnerView {
    const metadata = this.metadataOf(row);
    return {
      id: row.id,
      name: metadata.name,
      labels: metadata.labels,
      approvalPolicy: metadata.approvalPolicy,
      hostname: row.hostname,
      platform: row.platform,
      agentVersion: row.agentVersion,
      status: row.status,
      lastHeartbeatAt: row.lastHeartbeatAt,
    };
  }
}
