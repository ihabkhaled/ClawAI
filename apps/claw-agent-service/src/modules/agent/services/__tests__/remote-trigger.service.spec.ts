import { HttpException, HttpStatus } from '@nestjs/common';
import { RemoteTriggerService } from '../remote-trigger.service';
import { RemoteJobRunner, RemoteTriggerIdempotencyStore } from '../remote-trigger.ports';
import { REMOTE_TRIGGER_PENDING_MARKER } from '../../constants/remote-trigger.constants';
import {
  RiskLabel,
  type ScheduledCommand,
  ScheduledCommandStatus,
  type TerminalCommand,
  TerminalCommandStatus,
} from '../../../../generated/prisma';

const now = new Date('2026-09-29T00:00:00.000Z');

function scheduled(userId: string): ScheduledCommand {
  return {
    id: 'job-1',
    userId,
    deviceId: 'device-1',
    name: 'nightly tests',
    command: 'npm test',
    workingDir: null,
    intervalMinutes: 60,
    status: ScheduledCommandStatus.ENABLED,
    lastRunAt: null,
    lastCommandId: null,
    nextRunAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function command(id: string): TerminalCommand {
  return {
    id,
    sessionId: 'session-1',
    userId: 'user-1',
    command: 'npm test',
    workingDir: null,
    status: TerminalCommandStatus.PENDING_APPROVAL,
    riskScore: 0,
    riskLabel: RiskLabel.LOW,
    matchedPolicyId: null,
    riskReasons: null,
    autoApproved: false,
    blockedByPolicy: false,
    stdout: null,
    stderr: null,
    exitCode: null,
    approvedAt: null,
    rejectedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelRequested: false,
    rejectionReason: null,
    timeoutSeconds: 300,
    requestedAt: now,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

class MemoryIdempotency extends RemoteTriggerIdempotencyStore {
  readonly keys = new Map<string, string>();

  claim(key: string): Promise<boolean> {
    if (this.keys.has(key)) return Promise.resolve(false);
    this.keys.set(key, REMOTE_TRIGGER_PENDING_MARKER);
    return Promise.resolve(true);
  }

  read(key: string): Promise<string | null> {
    return Promise.resolve(this.keys.get(key) ?? null);
  }

  settle(key: string, commandId: string): Promise<void> {
    this.keys.set(key, commandId);
    return Promise.resolve();
  }

  release(key: string): Promise<void> {
    this.keys.delete(key);
    return Promise.resolve();
  }
}

class FakeRunner extends RemoteJobRunner {
  fired = 0;
  online = true;
  readonly created = new Map<string, TerminalCommand>();

  findOwned(userId: string, id: string): Promise<ScheduledCommand | null> {
    return Promise.resolve(userId === 'user-1' && id === 'job-1' ? scheduled(userId) : null);
  }

  fire(): Promise<TerminalCommand | null> {
    if (!this.online) return Promise.resolve(null);
    this.fired += 1;
    const created = command(`cmd-${String(this.fired)}`);
    this.created.set(created.id, created);
    return Promise.resolve(created);
  }

  findCommand(id: string): Promise<TerminalCommand | null> {
    return Promise.resolve(this.created.get(id) ?? null);
  }
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpException) return error.getStatus();
  }
  return 0;
}

describe('RemoteTriggerService', () => {
  let runner: FakeRunner;
  let store: MemoryIdempotency;
  let service: RemoteTriggerService;

  beforeEach(() => {
    runner = new FakeRunner();
    store = new MemoryIdempotency();
    service = new RemoteTriggerService(runner, store);
  });

  it('fires once and replays the same command for a repeated key', async () => {
    const first = await service.trigger('user-1', 'job-1', 'key-000001');
    const second = await service.trigger('user-1', 'job-1', 'key-000001');

    expect(first).toMatchObject({ replayed: false, command: { id: 'cmd-1' } });
    expect(second).toMatchObject({ replayed: true, command: { id: 'cmd-1' } });
    expect(runner.fired).toBe(1);
  });

  it('fires again for a different key', async () => {
    await service.trigger('user-1', 'job-1', 'key-000001');
    const other = await service.trigger('user-1', 'job-1', 'key-000002');

    expect(other.command.id).toBe('cmd-2');
    expect(runner.fired).toBe(2);
  });

  it('404s a job the caller does not own, without claiming the key', async () => {
    expect(await statusOf(service.trigger('user-2', 'job-1', 'key-000001'))).toBe(
      HttpStatus.NOT_FOUND,
    );
    expect(store.keys.size).toBe(0);
  });

  it('409s an offline device and releases the key for a later retry', async () => {
    runner.online = false;
    expect(await statusOf(service.trigger('user-1', 'job-1', 'key-000001'))).toBe(
      HttpStatus.CONFLICT,
    );
    expect(store.keys.size).toBe(0);

    runner.online = true;
    const retried = await service.trigger('user-1', 'job-1', 'key-000001');
    expect(retried.replayed).toBe(false);
  });

  it('409s while the first request with that key is still in flight', async () => {
    await store.claim('agent:remote-trigger:user-1:job-1:key-000001');

    expect(await statusOf(service.trigger('user-1', 'job-1', 'key-000001'))).toBe(
      HttpStatus.CONFLICT,
    );
    expect(runner.fired).toBe(0);
  });
});
