import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import { AgentSessionStatus } from '../../../../common/enums/agent-session-status.enum';
import { RunnerApprovalPolicy } from '../../../../common/enums/runner-approval-policy.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { PROMPT_JOB_APPROVAL_NOTE } from '../../constants/runner.constants';
import { RUNTIME_PROTOCOL_DESCRIPTOR } from '../../constants/runtime-protocol.constants';
import { RoutineRunSource } from '../../../../common/enums/routine-run-source.enum';
import { RunnerService } from '../runner.service';
import { RuntimeProtocolService } from '../runtime-protocol.service';
import type { AgentCommandManager } from '../../managers/agent-command.manager';
import type { AgentCommandRepository } from '../../repositories/agent-command.repository';
import type { RunnerCredentialRepository } from '../../repositories/runner-credential.repository';
import type { RunnerPolicyService } from '../../../fleet/services/runner-policy.service';
import type { RunnerRepository } from '../../repositories/runner.repository';
import type { AgentCommandService } from '../agent-command.service';
import type { AgentSessionService } from '../agent-session.service';
import type { RoutineSecretService } from '../routine-secret.service';
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
    runnerCompliance: null,
    runnerComplianceReason: null,
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
    recordRefusal: vi.fn().mockResolvedValue(undefined),
    recordCompliance: vi.fn().mockResolvedValue(undefined),
  };
  const runnerPolicy = {
    evaluate: vi
      .fn()
      .mockResolvedValue({ evaluated: true, status: null, reason: null, refuse: false }),
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
  const routineSecrets = {
    resolveForRun: vi.fn().mockResolvedValue([]),
    redactRunOutput: vi
      .fn()
      .mockImplementation((_job: unknown, output: unknown) => Promise.resolve(output)),
  };
  const commandRepo = {
    findById: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve({ id, sessionId: 'runner-1', userId: 'user-1', routineId: null }),
      ),
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
      new RuntimeProtocolService(),
      partial<RunnerPolicyService>(runnerPolicy),
      partial<RoutineSecretService>(routineSecrets),
    ),
    routineSecrets,
    repo,
    runnerPolicy,
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

    it('records the routine and what fired it on the job, never a secret', async () => {
      const { service, commandRepo } = setup();
      await service.dispatchPrompt(promptRoutine(), RoutineRunSource.WEBHOOK);
      await service.dispatchPrompt(promptRoutine());
      const created = commandRepo.create.mock.calls.map(
        (call) => call[0] as Record<string, unknown>,
      );
      expect(created.map((data) => [data['routineId'], data['routineRunSource']])).toEqual([
        ['routine-1', 'WEBHOOK'],
        ['routine-1', 'SCHEDULE'],
      ]);
      expect(JSON.stringify(created)).not.toContain('secret');
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
      expect(claimed[0]?.secrets).toEqual([]);
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
      const result = await service.heartbeat('runner-1', 'user-1');
      expect(repo.touchHeartbeat).toHaveBeenCalledWith(
        'runner-1',
        {},
        { status: null, reason: null },
      );
      expect(credentials.touch).toHaveBeenCalledWith('runner-1');
      expect(result).toEqual({ ok: true, nextHeartbeatInSeconds: 60 });
    });

    it('records the version and platform a runner reports at heartbeat (F100, record only)', async () => {
      const { service, repo } = setup();
      const result = await service.heartbeat('runner-1', 'user-1', {
        agentVersion: '1.90.0',
        platform: 'windows',
      });
      expect(repo.touchHeartbeat).toHaveBeenCalledWith(
        'runner-1',
        { agentVersion: '1.90.0', platform: 'windows' },
        { status: null, reason: null },
      );
      expect(result).toEqual({ ok: true, nextHeartbeatInSeconds: 60 });
    });

    it('a heartbeat with no report leaves the registered version and platform alone', async () => {
      const { service, repo } = setup();
      await service.heartbeat('runner-1', 'user-1', undefined);
      expect(repo.touchHeartbeat).toHaveBeenCalledWith(
        'runner-1',
        {},
        { status: null, reason: null },
      );
    });

    it('a revoked runner reporting a version records nothing and is still refused', async () => {
      const { service, repo, credentials } = setup();
      repo.touchHeartbeat.mockResolvedValueOnce(0);
      await expect(
        service.heartbeat('runner-1', 'user-1', { agentVersion: '9.9.9' }),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(credentials.touch).not.toHaveBeenCalled();
    });

    it('heartbeat of a revoked (disconnected) runner is refused', async () => {
      const { service, repo, credentials } = setup();
      repo.touchHeartbeat.mockResolvedValueOnce(0);
      await expect(service.heartbeat('runner-1', 'user-1')).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(credentials.touch).not.toHaveBeenCalled();
    });

    it('hands the claimed job the secrets its routine grants, asking as the runner owner', async () => {
      const { service, routineSecrets } = setup();
      routineSecrets.resolveForRun.mockResolvedValueOnce([{ name: 'API_KEY', value: 'v' }]);
      const [job] = await service.claim('runner-1');
      expect(job?.secrets).toEqual([{ name: 'API_KEY', value: 'v' }]);
      expect(routineSecrets.resolveForRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a' }),
        'user-1',
      );
    });

    it('a stale runner is never asked for secrets', async () => {
      const { service, routineSecrets } = setup([row({ lastHeartbeatAt: stale() })]);
      await service.claim('runner-1');
      expect(routineSecrets.resolveForRun).not.toHaveBeenCalled();
    });

    it('scrubs a routine job output through the secret layer before it is stored', async () => {
      const { service, commands, commandRepo, routineSecrets } = setup();
      commandRepo.findById.mockResolvedValueOnce({
        id: 'a',
        sessionId: 'runner-1',
        userId: 'user-1',
        routineId: 'routine-1',
      });
      routineSecrets.redactRunOutput.mockResolvedValueOnce({ stdout: 'token=[REDACTED]' });
      await service.complete('runner-1', 'a', { exitCode: 0, stdout: 'token=abcd1234' });
      expect(commands.complete).toHaveBeenCalledWith('runner-1', 'a', {
        exitCode: 0,
        stdout: 'token=[REDACTED]',
      });
    });

    it('does not consult the secret layer for another runner or a non-routine job', async () => {
      const { service, commands, commandRepo, routineSecrets } = setup();
      commandRepo.findById.mockResolvedValueOnce({
        id: 'a',
        sessionId: 'runner-2',
        userId: 'user-1',
        routineId: 'routine-1',
      });
      await service.complete('runner-1', 'a', { exitCode: 0, stdout: 'x' });
      await service.complete('runner-1', 'a', { exitCode: 0, stdout: 'y' });
      expect(routineSecrets.redactRunOutput).not.toHaveBeenCalled();
      expect(commands.complete).toHaveBeenCalledTimes(2);
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

describe('RunnerService.resumeManifest (F095 resume)', () => {
  it('returns what the server knows about the runner and the protocol it speaks', async () => {
    const { service, repo } = setup();
    const manifest = await service.resumeManifest('runner-1', 'user-1');
    expect(repo.findOwned).toHaveBeenCalledWith('runner-1', 'user-1');
    expect(manifest.online).toBe(true);
    expect(manifest.runner).toMatchObject({
      id: 'runner-1',
      name: 'Build box',
      labels: ['linux', 'gpu'],
      approvalPolicy: RunnerApprovalPolicy.ASK,
      platform: 'linux',
      agentVersion: '1.0.0',
    });
    expect(manifest.protocol).toBe(RUNTIME_PROTOCOL_DESCRIPTOR);
  });

  it('says the runner is offline when its heartbeat is stale, so the client can warn', async () => {
    const { service } = setup([row({ lastHeartbeatAt: stale() })]);
    expect((await service.resumeManifest('runner-1', 'user-1')).online).toBe(false);
  });

  it('says offline for an EXPIRED or revoked runner, and still answers (not a 404)', async () => {
    for (const status of [AgentSessionStatus.EXPIRED, AgentSessionStatus.DISCONNECTED]) {
      const { service } = setup([row({ status })]);
      const manifest = await service.resumeManifest('runner-1', 'user-1');
      expect(manifest.online).toBe(false);
      expect(manifest.runner.status).toBe(status);
    }
  });

  it("answers 404 for another user's runner, exactly like a missing one (IDOR)", async () => {
    const { service, repo } = setup();
    repo.findOwned.mockResolvedValueOnce(null);
    await expect(service.resumeManifest('runner-of-someone-else', 'user-1')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(repo.findOwned).toHaveBeenCalledWith('runner-of-someone-else', 'user-1');
  });

  it('never carries a credential', async () => {
    const { service } = setup();
    const text = JSON.stringify(await service.resumeManifest('runner-1', 'user-1'));
    expect(text).not.toMatch(/sessionKey|runnerToken|tokenHash|clwr_/);
  });
});

describe('RunnerService runner policy (F100, staged)', () => {
  const decision = (overrides: Record<string, unknown> = {}) => ({
    evaluated: true,
    status: null,
    reason: null,
    refuse: false,
    ...overrides,
  });
  const reported = { agentVersion: '1.0.0', platform: 'linux' };

  afterEach(() => vi.restoreAllMocks());

  it('judges the heartbeat as the runner owner, never a body-supplied user', async () => {
    const { service, runnerPolicy } = setup();
    await service.heartbeat('runner-1', 'owner-7', reported);
    expect(runnerPolicy.evaluate).toHaveBeenCalledWith('owner-7', reported);
  });

  it('mode off: nothing is flagged, nothing is audited, the heartbeat lands', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, repo } = setup();
    await service.heartbeat('runner-1', 'user-1', reported);
    expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', reported, {
      status: null,
      reason: null,
    });
    expect(repo.recordRefusal).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('report mode: flags and audits a non-compliant runner but never rejects it', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, repo, runnerPolicy, credentials } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'noncompliant', reason: 'version_below_minimum' }),
    );
    const result = await service.heartbeat('runner-1', 'user-1', reported);
    expect(result.ok).toBe(true);
    expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', reported, {
      status: 'noncompliant',
      reason: 'version_below_minimum',
    });
    expect(credentials.touch).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('version_below_minimum');
  });

  it('audits a verdict once per change, not once per heartbeat', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, repo, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'noncompliant', reason: 'version_below_minimum' }),
    );
    repo.findById.mockResolvedValue(
      row({ runnerCompliance: 'noncompliant', runnerComplianceReason: 'version_below_minimum' }),
    );
    await service.heartbeat('runner-1', 'user-1', reported);
    expect(warn).not.toHaveBeenCalled();
  });

  it('enforce mode: refuses with a clear 403, records why, and does not revive the runner', async () => {
    const { service, repo, runnerPolicy, credentials } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'noncompliant', reason: 'version_below_minimum', refuse: true }),
    );
    const failure = await service
      .heartbeat('runner-1', 'user-1', reported)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(BusinessException);
    const refusal = failure as BusinessException;
    expect(refusal.code).toBe('RUNNER_POLICY_VIOLATION');
    expect(refusal.getStatus()).toBe(403);
    expect(refusal.details).toEqual({ reason: 'version_below_minimum' });
    expect(repo.recordRefusal).toHaveBeenCalledWith('runner-1', reported, expect.anything());
    expect(repo.touchHeartbeat).not.toHaveBeenCalled();
    expect(credentials.touch).not.toHaveBeenCalled();
  });

  it('a repeated refusal still refuses but does not repeat the audit entry', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, repo, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'noncompliant', reason: 'platform_not_allowed', refuse: true }),
    );
    repo.findById.mockResolvedValue(
      row({ runnerCompliance: 'noncompliant', runnerComplianceReason: 'platform_not_allowed' }),
    );
    await expect(service.heartbeat('runner-1', 'user-1', reported)).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('fails open: no verdict lets the runner through and keeps the stored verdict', async () => {
    const { service, repo, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(decision({ evaluated: false }));
    const result = await service.heartbeat('runner-1', 'user-1', reported);
    expect(result.ok).toBe(true);
    expect(repo.touchHeartbeat).toHaveBeenCalledWith('runner-1', reported, undefined);
  });

  it('a revoked runner is still refused as offline when policy passes it', async () => {
    const { service, repo, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(decision());
    repo.touchHeartbeat.mockResolvedValueOnce(0);
    await expect(service.heartbeat('runner-1', 'user-1', reported)).rejects.toMatchObject({
      code: 'RUNNER_OFFLINE',
    });
  });

  it('register: an enforced refusal creates no session and no credential', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, sessions, credentialService, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'noncompliant', reason: 'version_below_minimum', refuse: true }),
    );
    await expect(
      service.register('user-1', {
        hostname: 'box',
        platform: 'linux',
        agentVersion: '0.1.0',
        name: 'Box',
        labels: [],
        approvalPolicy: RunnerApprovalPolicy.ASK,
      }),
    ).rejects.toMatchObject({ code: 'RUNNER_POLICY_VIOLATION' });
    expect(sessions.register).not.toHaveBeenCalled();
    expect(credentialService.issue).not.toHaveBeenCalled();
  });

  it('register: report mode records the verdict on the new session and still registers', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, repo, runnerPolicy } = setup();
    runnerPolicy.evaluate.mockResolvedValue(
      decision({ status: 'unknown', reason: 'version_missing' }),
    );
    const result = await service.register('user-1', {
      hostname: 'box',
      platform: 'linux',
      agentVersion: '1.0.0',
      name: 'Box',
      labels: [],
      approvalPolicy: RunnerApprovalPolicy.ASK,
    });
    expect(result.runnerId).toBe('runner-9');
    expect(repo.recordCompliance).toHaveBeenCalledWith('runner-9', {
      status: 'unknown',
      reason: 'version_missing',
    });
  });

  it('list is scoped to the caller and shows the verdict for the owner (IDOR)', async () => {
    const { service, repo } = setup([
      row({ runnerCompliance: 'noncompliant', runnerComplianceReason: 'version_below_minimum' }),
    ]);
    const views = await service.list('user-1');
    expect(repo.listConnected).toHaveBeenCalledWith('user-1', expect.any(Date));
    expect(views[0]?.compliance).toEqual({
      status: 'noncompliant',
      reason: 'version_below_minimum',
    });
  });

  it('list shows no verdict when none was evaluated', async () => {
    const { service } = setup();
    const views = await service.list('user-1');
    expect(views[0]?.compliance).toBeNull();
  });
});
