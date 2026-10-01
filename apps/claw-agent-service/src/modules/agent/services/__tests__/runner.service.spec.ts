import { vi } from 'vitest';
import { AgentSessionStatus } from '../../../../common/enums/agent-session-status.enum';
import { RunnerApprovalPolicy } from '../../../../common/enums/runner-approval-policy.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { PROMPT_JOB_APPROVAL_NOTE } from '../../constants/runner.constants';
import { RunnerService } from '../runner.service';
import type { AgentCommandManager } from '../../managers/agent-command.manager';
import type { AgentCommandRepository } from '../../repositories/agent-command.repository';
import type { RunnerCredentialRepository } from '../../repositories/runner-credential.repository';
import type { RunnerRepository } from '../../repositories/runner.repository';
import type { AgentCommandService } from '../agent-command.service';
import type { AgentSessionService } from '../agent-session.service';
import type { RunnerCredentialService } from '../runner-credential.service';
import type { RunnerRow } from '../../types/runner.types';
import type { ScheduledCommand, TerminalCommand } from '../../../../generated/prisma';

function row(overrides: Partial<RunnerRow> = {}): RunnerRow {
  return {
    id: 'runner-1',
    userId: 'user-1',
    hostname: 'build-box',
    platform: 'linux',
    agentVersion: '1.0.0',
    status: AgentSessionStatus.CONNECTED,
    lastHeartbeatAt: new Date(),
    metadata: { kind: 'runner', name: 'Build box', labels: ['linux', 'gpu'] },
    ...overrides,
  } as RunnerRow;
}

function command(id: string): TerminalCommand {
  return { id, sessionId: 'runner-1', command: 'npm test' } as TerminalCommand;
}

function promptRoutine(overrides: Partial<ScheduledCommand> = {}): ScheduledCommand {
  return {
    id: 'routine-1',
    userId: 'user-1',
    deviceId: null,
    kind: 'PROMPT',
    command: 'Summarise open TODOs',
    model: 'gemini-2.5-flash',
    repoRef: 'claw',
    runnerLabels: ['gpu'],
    intervalMinutes: 60,
    ...overrides,
  } as ScheduledCommand;
}

/** A test double that implements only what RunnerService calls. */
function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

function setup(rows: RunnerRow[] = [row()]) {
  const repo = {
    listConnected: vi.fn().mockResolvedValue(rows),
    findOwned: vi.fn().mockResolvedValue(rows[0] ?? null),
    findById: vi.fn().mockResolvedValue(rows[0] ?? null),
    touchHeartbeat: vi.fn().mockResolvedValue(1),
  };
  const credentials = { touch: vi.fn().mockResolvedValue(undefined) };
  const credentialService = {
    issue: vi.fn().mockResolvedValue({
      token: 'clwr_secret',
      tokenHash: 'digest',
      tokenPrefix: 'clwr_secret'.slice(0, 11),
    }),
  };
  const sessions = {
    register: vi.fn().mockResolvedValue({ id: 'runner-9', sessionKey: 'session-key' }),
  };
  const commands = {
    createCommand: vi
      .fn()
      .mockImplementation((_user: string, dto: { sessionId: string }) =>
        Promise.resolve({ id: 'cmd-1', sessionId: dto.sessionId }),
      ),
    getPendingForSession: vi.fn().mockResolvedValue([command('a'), command('b')]),
    complete: vi.fn().mockResolvedValue(command('a')),
  };
  const commandRepo = {
    create: vi
      .fn()
      .mockImplementation((data: { session: { connect: { id: string } } }) =>
        Promise.resolve({ id: 'job-1', sessionId: data.session.connect.id }),
      ),
  };
  const manager = {
    startExecution: vi.fn().mockImplementation((id: string) => Promise.resolve(command(id))),
  };
  return {
    service: new RunnerService(
      partial<RunnerRepository>(repo),
      partial<RunnerCredentialRepository>(credentials),
      partial<RunnerCredentialService>(credentialService),
      partial<AgentSessionService>(sessions),
      partial<AgentCommandService>(commands),
      partial<AgentCommandRepository>(commandRepo),
      partial<AgentCommandManager>(manager),
    ),
    repo,
    credentials,
    credentialService,
    sessions,
    commands,
    commandRepo,
    manager,
  };
}

const stale = (): Date => new Date(Date.now() - 10 * 60 * 1000);

describe('RunnerService', () => {
  it('registers a runner, issues its own token and never returns the session key', async () => {
    const { service, sessions, credentialService } = setup();
    const result = await service.register('user-1', {
      hostname: 'box',
      platform: 'linux',
      agentVersion: '1.0.0',
      name: 'Box',
      labels: ['gpu', 'gpu', 'linux'],
      approvalPolicy: RunnerApprovalPolicy.AUTO_APPROVE_READ_ONLY,
    });
    expect(sessions.register).toHaveBeenCalledWith('user-1', {
      hostname: 'box',
      platform: 'linux',
      agentVersion: '1.0.0',
      metadata: {
        kind: 'runner',
        name: 'Box',
        labels: ['gpu', 'linux'],
        approvalPolicy: RunnerApprovalPolicy.AUTO_APPROVE_READ_ONLY,
      },
    });
    expect(credentialService.issue).toHaveBeenCalledWith('runner-9', 'user-1');
    expect(result).toEqual({
      runnerId: 'runner-9',
      runnerToken: 'clwr_secret',
      tokenPrefix: 'clwr_secret',
      approvalPolicy: RunnerApprovalPolicy.AUTO_APPROVE_READ_ONLY,
      heartbeatIntervalSeconds: 60,
    });
    expect(JSON.stringify(result)).not.toContain('session-key');
  });

  it('lists only the caller live runners with their approval policy', async () => {
    const { service, repo } = setup();
    const views = await service.list('user-1');
    expect(repo.listConnected).toHaveBeenCalledWith('user-1', expect.any(Date));
    const freshSince = repo.listConnected.mock.calls[0]?.[1] as Date;
    expect(Date.now() - freshSince.getTime()).toBeGreaterThanOrEqual(119_000);
    expect(views[0]).toMatchObject({
      id: 'runner-1',
      name: 'Build box',
      labels: ['linux', 'gpu'],
      approvalPolicy: RunnerApprovalPolicy.ASK,
    });
    expect(JSON.stringify(views)).not.toContain('sessionKey');
  });

  it('falls back to hostname, no labels and ASK when metadata is malformed', async () => {
    const { service } = setup([row({ metadata: ['bad'] as never })]);
    const [view] = await service.list('user-1');
    expect(view).toMatchObject({
      name: 'build-box',
      labels: [],
      approvalPolicy: RunnerApprovalPolicy.ASK,
    });
  });

  it("refuses to dispatch to another user's runner (404, no command created)", async () => {
    const { service, repo, commands } = setup();
    repo.findOwned.mockResolvedValueOnce(null);
    await expect(
      service.dispatchTo('someone-else', 'user-1', { command: 'ls', labels: [] }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(repo.findOwned).toHaveBeenCalledWith('someone-else', 'user-1');
    expect(commands.createCommand).not.toHaveBeenCalled();
  });

  it('refuses to dispatch to an offline runner', async () => {
    const { service, commands } = setup([row({ status: AgentSessionStatus.EXPIRED })]);
    await expect(
      service.dispatchTo('runner-1', 'user-1', { command: 'ls', labels: [] }),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(commands.createCommand).not.toHaveBeenCalled();
  });

  it('refuses to dispatch to a connected runner whose heartbeat is stale', async () => {
    const { service, commands } = setup([row({ lastHeartbeatAt: stale() })]);
    await expect(
      service.dispatchTo('runner-1', 'user-1', { command: 'ls', labels: [] }),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(commands.createCommand).not.toHaveBeenCalled();
  });

  it('dispatches through createCommand so the policy engine still scores the job', async () => {
    const { service, commands } = setup();
    await service.dispatchTo('runner-1', 'user-1', {
      command: 'npm test',
      workingDir: '/repo',
      labels: [],
    });
    expect(commands.createCommand).toHaveBeenCalledWith('user-1', {
      sessionId: 'runner-1',
      command: 'npm test',
      workingDir: '/repo',
    });
  });

  it('places a job on the first live runner carrying every label', async () => {
    const { service, commands } = setup([
      row({ id: 'cpu', metadata: { kind: 'runner', name: 'cpu', labels: ['linux'] } }),
      row({ id: 'gpu', metadata: { kind: 'runner', name: 'gpu', labels: ['linux', 'gpu'] } }),
    ]);
    const job = await service.dispatch('user-1', { command: 'train', labels: ['gpu'] });
    expect(job.sessionId).toBe('gpu');
    expect(commands.createCommand).toHaveBeenCalledTimes(1);
  });

  it('fails placement when no runner matches', async () => {
    const { service } = setup();
    await expect(
      service.dispatch('user-1', { command: 'x', labels: ['arm64'] }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  describe('prompt routines (F099)', () => {
    it('queues a PROMPT job on the owner live runner carrying the labels', async () => {
      const { service, repo, commandRepo } = setup();
      const job = await service.dispatchPrompt(promptRoutine());
      expect(repo.listConnected).toHaveBeenCalledWith('user-1', expect.any(Date));
      expect(job?.sessionId).toBe('runner-1');
      expect(commandRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session: { connect: { id: 'runner-1' } },
          userId: 'user-1',
          kind: 'PROMPT',
          command: 'Summarise open TODOs',
          model: 'gemini-2.5-flash',
          repoRef: 'claw',
          status: 'APPROVED',
          riskReasons: PROMPT_JOB_APPROVAL_NOTE,
        }),
      );
    });

    it('defers (null) when no live runner carries the labels', async () => {
      const { service, commandRepo } = setup();
      const job = await service.dispatchPrompt(promptRoutine({ runnerLabels: ['arm64'] }));
      expect(job).toBeNull();
      expect(commandRepo.create).not.toHaveBeenCalled();
    });

    it("only ever looks at the routine owner's runners", async () => {
      const { service, repo } = setup([]);
      await service.dispatchPrompt(promptRoutine({ userId: 'user-2' }));
      expect(repo.listConnected).toHaveBeenCalledWith('user-2', expect.any(Date));
    });
  });

  describe('runner-authenticated routes (F100)', () => {
    it('claims at most one job per call', async () => {
      const { service, manager } = setup();
      const claimed = await service.claim('runner-1');
      expect(claimed.map((c) => c.id)).toEqual(['a']);
      expect(manager.startExecution).toHaveBeenCalledTimes(1);
    });

    it('skips a job another process already claimed', async () => {
      const { service, manager } = setup();
      manager.startExecution.mockResolvedValueOnce(null);
      const claimed = await service.claim('runner-1');
      expect(claimed.map((c) => c.id)).toEqual(['b']);
    });

    it('claims only jobs addressed to the calling runner', async () => {
      const { service, commands, manager } = setup();
      await service.claim('runner-1');
      expect(commands.getPendingForSession).toHaveBeenCalledWith('runner-1');
      expect(manager.startExecution).toHaveBeenCalledWith('a', 'runner-1');
    });

    it('a stale runner claims nothing', async () => {
      const { service, commands } = setup([row({ lastHeartbeatAt: stale() })]);
      expect(await service.claim('runner-1')).toEqual([]);
      expect(commands.getPendingForSession).not.toHaveBeenCalled();
    });

    it('an expired runner claims nothing', async () => {
      const { service, commands } = setup([row({ status: AgentSessionStatus.EXPIRED })]);
      expect(await service.claim('runner-1')).toEqual([]);
      expect(commands.getPendingForSession).not.toHaveBeenCalled();
    });

    it('heartbeat refreshes the session and the credential', async () => {
      const { service, repo, credentials } = setup();
      const result = await service.heartbeat('runner-1');
      expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', {});
      expect(credentials.touch).toHaveBeenCalledWith('runner-1');
      expect(result).toEqual({ ok: true, nextHeartbeatInSeconds: 60 });
    });

    it('records the version and platform a runner reports at heartbeat (F100, record only)', async () => {
      const { service, repo } = setup();
      const result = await service.heartbeat('runner-1', {
        agentVersion: '1.90.0',
        platform: 'windows',
      });
      expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', {
        agentVersion: '1.90.0',
        platform: 'windows',
      });
      expect(result).toEqual({ ok: true, nextHeartbeatInSeconds: 60 });
    });

    it('a heartbeat with no report leaves the registered version and platform alone', async () => {
      const { service, repo } = setup();
      await service.heartbeat('runner-1', undefined);
      expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', {});
    });

    it('a revoked runner reporting a version records nothing and is still refused', async () => {
      const { service, repo, credentials } = setup();
      repo.touchHeartbeat.mockResolvedValueOnce(0);
      await expect(service.heartbeat('runner-1', { agentVersion: '9.9.9' })).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(credentials.touch).not.toHaveBeenCalled();
    });

    it('heartbeat of a revoked (disconnected) runner is refused', async () => {
      const { service, repo, credentials } = setup();
      repo.touchHeartbeat.mockResolvedValueOnce(0);
      await expect(service.heartbeat('runner-1')).rejects.toBeInstanceOf(BusinessException);
      expect(credentials.touch).not.toHaveBeenCalled();
    });

    it('reports through complete with the calling runner as the session', async () => {
      const { service, commands } = setup();
      await service.complete('runner-1', 'a', { exitCode: 0, stdout: 'done' });
      expect(commands.complete).toHaveBeenCalledWith('runner-1', 'a', {
        exitCode: 0,
        stdout: 'done',
      });
    });
  });
});
