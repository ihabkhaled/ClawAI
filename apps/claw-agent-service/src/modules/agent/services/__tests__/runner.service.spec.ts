import { vi } from 'vitest';
import { AgentSessionStatus } from '../../../../common/enums/agent-session-status.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { RunnerService } from '../runner.service';
import type { AgentCommandManager } from '../../managers/agent-command.manager';
import type { RunnerRepository } from '../../repositories/runner.repository';
import type { AgentCommandService } from '../agent-command.service';
import type { AgentSessionService } from '../agent-session.service';
import type { RunnerRow } from '../../types/runner.types';
import type { TerminalCommand } from '../../../../generated/prisma';

function row(overrides: Partial<RunnerRow> = {}): RunnerRow {
  return {
    id: 'runner-1',
    userId: 'user-1',
    hostname: 'build-box',
    platform: 'linux',
    agentVersion: '1.0.0',
    status: AgentSessionStatus.CONNECTED,
    lastHeartbeatAt: new Date('2026-09-29T00:00:00Z'),
    metadata: { kind: 'runner', name: 'Build box', labels: ['linux', 'gpu'] },
    ...overrides,
  } as RunnerRow;
}

function command(id: string): TerminalCommand {
  return { id, sessionId: 'runner-1', command: 'npm test' } as TerminalCommand;
}

/** A test double that implements only what RunnerService calls. */
function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

function setup(rows: RunnerRow[] = [row()]) {
  const repo = {
    listConnected: vi.fn().mockResolvedValue(rows),
    findOwned: vi.fn().mockResolvedValue(rows[0] ?? null),
  };
  const sessions = {
    register: vi.fn().mockResolvedValue({ id: 'runner-9', sessionKey: 'secret-key' }),
  };
  const commands = {
    createCommand: vi
      .fn()
      .mockImplementation((_user: string, dto: { sessionId: string }) =>
        Promise.resolve({ id: 'cmd-1', sessionId: dto.sessionId }),
      ),
    getPendingForSession: vi.fn().mockResolvedValue([command('a'), command('b')]),
  };
  const manager = {
    startExecution: vi.fn().mockImplementation((id: string) => Promise.resolve(command(id))),
  };
  return {
    service: new RunnerService(
      partial<RunnerRepository>(repo),
      partial<AgentSessionService>(sessions),
      partial<AgentCommandService>(commands),
      partial<AgentCommandManager>(manager),
    ),
    repo,
    sessions,
    commands,
    manager,
  };
}

describe('RunnerService', () => {
  it('registers a runner as a session marked kind=runner with de-duplicated labels', async () => {
    const { service, sessions } = setup();
    const result = await service.register('user-1', {
      hostname: 'box',
      platform: 'linux',
      agentVersion: '1.0.0',
      name: 'Box',
      labels: ['gpu', 'gpu', 'linux'],
    });
    expect(sessions.register).toHaveBeenCalledWith('user-1', {
      hostname: 'box',
      platform: 'linux',
      agentVersion: '1.0.0',
      metadata: { kind: 'runner', name: 'Box', labels: ['gpu', 'linux'] },
    });
    expect(result).toEqual({
      runnerId: 'runner-9',
      sessionKey: 'secret-key',
      heartbeatIntervalSeconds: 60,
    });
  });

  it('lists only the caller runners and never returns a session key', async () => {
    const { service, repo } = setup();
    const views = await service.list('user-1');
    expect(repo.listConnected).toHaveBeenCalledWith('user-1');
    expect(views[0]).toMatchObject({ id: 'runner-1', name: 'Build box', labels: ['linux', 'gpu'] });
    expect(JSON.stringify(views)).not.toContain('sessionKey');
  });

  it('falls back to hostname and no labels when metadata is malformed', async () => {
    const { service } = setup([row({ metadata: ['bad'] as never })]);
    const [view] = await service.list('user-1');
    expect(view).toMatchObject({ name: 'build-box', labels: [] });
  });

  it('refuses to dispatch to a runner the caller does not own (404, no command created)', async () => {
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

  it('places a job on the first connected runner carrying every label', async () => {
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
});
