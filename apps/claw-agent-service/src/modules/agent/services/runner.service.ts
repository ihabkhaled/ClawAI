import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import { SESSION_HEARTBEAT_TIMEOUT_SECONDS } from '../../../common/constants/agent.constants';
import { RUNNER_CLAIM_LIMIT, RUNNER_METADATA_KIND } from '../constants/runner.constants';
import { RunnerRepository } from '../repositories/runner.repository';
import { AgentCommandManager } from '../managers/agent-command.manager';
import { AgentSessionService } from './agent-session.service';
import { AgentCommandService } from './agent-command.service';
import type { DispatchRunnerJobDto, RegisterRunnerDto } from '../dto/register-runner.dto';
import type {
  RegisterRunnerResult,
  RunnerMetadata,
  RunnerRow,
  RunnerView,
} from '../types/runner.types';
import type { TerminalCommand } from '../../../generated/prisma';

/**
 * F100 — self-hosted runners.
 *
 * A runner is an owner-scoped agent session marked `kind: runner`. Jobs are
 * ordinary TerminalCommands, so the policy engine scores every dispatched job
 * exactly as it scores a command typed in the portal: a DENY policy still
 * blocks it and nothing is auto-approved that would not be otherwise.
 */
@Injectable()
export class RunnerService {
  constructor(
    private readonly runners: RunnerRepository,
    private readonly sessions: AgentSessionService,
    private readonly commands: AgentCommandService,
    private readonly commandManager: AgentCommandManager,
  ) {}

  async register(userId: string, dto: RegisterRunnerDto): Promise<RegisterRunnerResult> {
    const metadata: RunnerMetadata = {
      kind: RUNNER_METADATA_KIND,
      name: dto.name,
      labels: [...new Set(dto.labels)],
    };
    const session = await this.sessions.register(userId, {
      hostname: dto.hostname,
      platform: dto.platform,
      agentVersion: dto.agentVersion,
      metadata,
    });
    return {
      runnerId: session.id,
      sessionKey: session.sessionKey,
      heartbeatIntervalSeconds: SESSION_HEARTBEAT_TIMEOUT_SECONDS / 2,
    };
  }

  async list(userId: string): Promise<RunnerView[]> {
    const rows = await this.runners.listConnected(userId);
    return rows.map((row) => this.toView(row));
  }

  async dispatchTo(
    runnerId: string,
    userId: string,
    dto: DispatchRunnerJobDto,
  ): Promise<TerminalCommand> {
    const runner = await this.runners.findOwned(runnerId, userId);
    if (runner === null) throw new EntityNotFoundException('Runner', runnerId);
    if (runner.status !== AgentSessionStatus.CONNECTED) {
      throw new BusinessException('agent.runner.offline', 'RUNNER_OFFLINE', HttpStatus.CONFLICT);
    }
    return this.enqueue(runner.id, userId, dto);
  }

  /** Placement: the most recently seen connected runner carrying every label. */
  async dispatch(userId: string, dto: DispatchRunnerJobDto): Promise<TerminalCommand> {
    const rows = await this.runners.listConnected(userId);
    const target = rows.find((row) => this.hasLabels(row, dto.labels));
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
   * Claim at most one approved job for the calling runner session. The
   * APPROVED to EXECUTING transition is a guarded update, so two processes
   * holding the same key cannot both claim one job.
   */
  async claim(sessionId: string): Promise<TerminalCommand[]> {
    const pending = await this.commands.getPendingForSession(sessionId);
    const claimed: TerminalCommand[] = [];
    for (const command of pending) {
      if (claimed.length >= RUNNER_CLAIM_LIMIT) break;
      const started = await this.commandManager.startExecution(command.id, sessionId);
      if (started !== null) claimed.push(started);
    }
    return claimed;
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

  private hasLabels(row: RunnerRow, required: string[]): boolean {
    const labels = new Set(this.metadataOf(row).labels);
    return required.every((label) => labels.has(label));
  }

  private metadataOf(row: RunnerRow): RunnerMetadata {
    const raw = row.metadata;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return { kind: RUNNER_METADATA_KIND, name: row.hostname, labels: [] };
    }
    const name = typeof raw['name'] === 'string' ? raw['name'] : row.hostname;
    const rawLabels = raw['labels'];
    const labels = Array.isArray(rawLabels)
      ? rawLabels.filter((label): label is string => typeof label === 'string')
      : [];
    return { kind: RUNNER_METADATA_KIND, name, labels };
  }

  private toView(row: RunnerRow): RunnerView {
    const metadata = this.metadataOf(row);
    return {
      id: row.id,
      name: metadata.name,
      labels: metadata.labels,
      hostname: row.hostname,
      platform: row.platform,
      agentVersion: row.agentVersion,
      status: row.status,
      lastHeartbeatAt: row.lastHeartbeatAt,
    };
  }
}
