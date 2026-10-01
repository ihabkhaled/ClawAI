import { vi } from 'vitest';
import { RoutineRunSource } from '../../../../common/enums/routine-run-source.enum';
import { SchedulerManager } from '../scheduler.manager';
import type { AgentCommandRepository } from '../../repositories/agent-command.repository';
import type { AgentSessionRepository } from '../../repositories/agent-session.repository';
import type { ScheduledCommandRepository } from '../../repositories/scheduled-command.repository';
import type { CommandRiskService } from '../../services/command-risk.service';
import type { RunnerService } from '../../services/runner.service';
import type { ScheduledCommand } from '../../../../generated/prisma';

function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

const now = new Date('2026-09-30T10:00:00.000Z');

function routine(overrides: Partial<ScheduledCommand>): ScheduledCommand {
  return {
    id: 'routine-1',
    userId: 'user-1',
    deviceId: null,
    kind: 'PROMPT',
    command: 'Summarise open TODOs',
    runnerLabels: [],
    intervalMinutes: 60,
    ...overrides,
  } as ScheduledCommand;
}

function setup(dispatched: { id: string } | null) {
  const scheduledRepo = { markRun: vi.fn().mockResolvedValue(undefined) };
  const commandRepo = { create: vi.fn() };
  const sessionRepo = { findConnectedForDevice: vi.fn().mockResolvedValue([]) };
  const risk = { assess: vi.fn() };
  const runners = { dispatchPrompt: vi.fn().mockResolvedValue(dispatched) };
  return {
    manager: new SchedulerManager(
      partial<ScheduledCommandRepository>(scheduledRepo),
      partial<AgentCommandRepository>(commandRepo),
      partial<AgentSessionRepository>(sessionRepo),
      partial<CommandRiskService>(risk),
      partial<RunnerService>(runners),
    ),
    scheduledRepo,
    commandRepo,
    sessionRepo,
    risk,
    runners,
  };
}

describe('SchedulerManager.fireOne', () => {
  it('sends a due PROMPT routine to a runner, never to a device session', async () => {
    const { manager, runners, sessionRepo, scheduledRepo, risk } = setup({ id: 'job-1' });
    const created = await manager.fireOne(routine({}), now);
    expect(created).toEqual({ id: 'job-1' });
    expect(runners.dispatchPrompt).toHaveBeenCalledTimes(1);
    expect(sessionRepo.findConnectedForDevice).not.toHaveBeenCalled();
    expect(risk.assess).not.toHaveBeenCalled();
    expect(scheduledRepo.markRun).toHaveBeenCalledWith(
      'routine-1',
      'job-1',
      new Date('2026-09-30T11:00:00.000Z'),
    );
  });

  it('passes the run source to the runner: schedule by default, otherwise the caller source', async () => {
    const { manager, runners } = setup({ id: 'job-1' });
    await manager.fireOne(routine({}), now);
    await manager.fireOne(routine({}), now, RoutineRunSource.WEBHOOK);
    expect(runners.dispatchPrompt.mock.calls.map((call) => call[1])).toEqual([
      'SCHEDULE',
      'WEBHOOK',
    ]);
  });

  it('advances a cron PROMPT routine to its next UTC slot, not by the placeholder interval', async () => {
    const { manager, scheduledRepo } = setup({ id: 'job-2' });
    await manager.fireOne(routine({ cron: '30 9 * * *', intervalMinutes: 5 }), now);
    expect(scheduledRepo.markRun).toHaveBeenCalledWith(
      'routine-1',
      'job-2',
      new Date('2026-10-01T09:30:00.000Z'),
    );
  });

  it('falls back to the interval when a stored cron no longer yields a date', async () => {
    const { manager, scheduledRepo } = setup({ id: 'job-3' });
    await manager.fireOne(routine({ cron: '0 0 31 2 *', intervalMinutes: 60 }), now);
    expect(scheduledRepo.markRun).toHaveBeenCalledWith(
      'routine-1',
      'job-3',
      new Date('2026-09-30T11:00:00.000Z'),
    );
  });

  it('defers a PROMPT routine when no runner is live, without advancing it', async () => {
    const { manager, scheduledRepo } = setup(null);
    expect(await manager.fireOne(routine({}), now)).toBeNull();
    expect(scheduledRepo.markRun).not.toHaveBeenCalled();
  });

  it('skips a COMMAND routine that has no device', async () => {
    const { manager, sessionRepo, runners } = setup(null);
    expect(await manager.fireOne(routine({ kind: 'COMMAND' }), now)).toBeNull();
    expect(sessionRepo.findConnectedForDevice).not.toHaveBeenCalled();
    expect(runners.dispatchPrompt).not.toHaveBeenCalled();
  });

  it('keeps the device path for a COMMAND routine', async () => {
    const { manager, sessionRepo, runners } = setup(null);
    expect(await manager.fireOne(routine({ kind: 'COMMAND', deviceId: 'dev-1' }), now)).toBeNull();
    expect(sessionRepo.findConnectedForDevice).toHaveBeenCalledWith('dev-1');
    expect(runners.dispatchPrompt).not.toHaveBeenCalled();
  });
});
