import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LivePolicyAdminRepository } from '../../repositories/live-policy-admin.repository';
import { LivePolicyAdminService } from '../live-policy-admin.service';
import { SERVER_PULL_PLATFORMS } from '../../../sources/constants/server-pull.constants';

const validConfig = {
  featureEnabled: true,
  killSwitch: false,
  plans: {},
  defaultPlan: { freeSecondsPerMonth: 600, paidMicroUsdPerMinute: 1000 },
  visionBilling: 'ACTUAL_COST',
  graceSeconds: 60,
  maxActiveStreams: 10,
  maxSessionsPerUser: 2,
  sessionsPerUserPerHour: 20,
  dailyBudgetMicroUsd: 50_000_000,
  budgetSoftStopPercent: 80,
  summaryModelChain: [{ connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' }],
  visionModelChain: [
    { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
  ],
  councilModelChain: [
    { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
  ],
  serverPullPlatforms: ['TWITCH'],
  recordedVideoMaxSeconds: 10800,
};

const row = (version: number, active: boolean, config: unknown = validConfig) => ({
  version,
  activeKey: active ? 'active' : null,
  config,
  note: null,
  createdBy: 'admin1',
  createdAt: new Date('2026-11-22T10:00:00Z'),
});

function build() {
  const repository = {
    listRecent: vi.fn().mockResolvedValue([row(2, true), row(1, false)]),
    findActive: vi.fn().mockResolvedValue(row(2, true)),
    findVersion: vi.fn(),
    createAndActivate: vi.fn().mockImplementation(async (config: unknown, note: string | null) => ({
      ...row(3, true, config),
      note,
    })),
  };
  const policy = { invalidate: vi.fn() };
  return {
    repository,
    policy,
    service: new LivePolicyAdminService(repository as never, policy as never),
  };
}

describe('LivePolicyAdminService', () => {
  it('lists the active version and recent versions', async () => {
    const { service } = build();
    const view = await service.overview();
    expect(view.active).toMatchObject({ version: 2, active: true });
    expect(view.versions.map((item) => item.version)).toEqual([2, 1]);
  });

  it('reports no active version when none exists', async () => {
    const { service, repository } = build();
    repository.findActive.mockResolvedValue(null);
    expect((await service.overview()).active).toBeNull();
  });

  it('publishes a valid config as a new version and invalidates the cache', async () => {
    const { service, repository, policy } = build();
    const view = await service.publish('admin1', validConfig, 'raise grace');
    expect(repository.createAndActivate).toHaveBeenCalledWith(validConfig, 'raise grace', 'admin1');
    expect(view).toMatchObject({ version: 3, active: true, note: 'raise grace' });
    expect(policy.invalidate).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid config with 400 and writes nothing', async () => {
    const { service, repository, policy } = build();
    const failure = await service
      .publish('admin1', { ...validConfig, graceSeconds: -1 }, undefined)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify((failure as BadRequestException).getResponse())).toContain(
      'graceSeconds',
    );
    expect(repository.createAndActivate).not.toHaveBeenCalled();
    expect(policy.invalidate).not.toHaveBeenCalled();
  });

  it('defaults server pull to every platform for a version saved before the field, and refuses Discord', async () => {
    const { service, repository } = build();
    const { serverPullPlatforms: _omitted, ...legacy } = validConfig;
    await service.publish('admin1', legacy, undefined);
    expect(repository.createAndActivate).toHaveBeenCalledWith(
      { ...validConfig, serverPullPlatforms: [...SERVER_PULL_PLATFORMS] },
      null,
      'admin1',
    );
    await service.publish('admin1', { ...validConfig, serverPullPlatforms: ['KICK'] }, undefined);
    await expect(
      service.publish('admin1', { ...validConfig, serverPullPlatforms: ['DISCORD'] }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.publish('admin1', { ...validConfig, serverPullPlatforms: [] }, undefined);
    expect(repository.createAndActivate).toHaveBeenLastCalledWith(
      { ...validConfig, serverPullPlatforms: [] },
      null,
      'admin1',
    );
  });

  it('rolls back by copying the old config as a NEW version', async () => {
    const { service, repository } = build();
    repository.findVersion.mockResolvedValue(row(1, false));
    const view = await service.rollback('admin1', 1, undefined);
    expect(repository.createAndActivate).toHaveBeenCalledWith(
      validConfig,
      'Rollback to version 1',
      'admin1',
    );
    expect(view.version).toBe(3);
  });

  it('404s an unknown rollback target and 422s a stored config the schema no longer accepts', async () => {
    const { service, repository } = build();
    repository.findVersion.mockResolvedValue(null);
    await expect(service.rollback('admin1', 9, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repository.findVersion.mockResolvedValue(row(1, false, { old: true }));
    await expect(service.rollback('admin1', 1, undefined)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('answers 409 when two admins publish at once and rethrows other failures', async () => {
    const { service, repository, policy } = build();
    repository.createAndActivate.mockRejectedValue({ code: 'P2002' });
    await expect(service.publish('admin1', validConfig, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
    repository.createAndActivate.mockRejectedValue(new Error('db down'));
    await expect(service.publish('admin1', validConfig, undefined)).rejects.toThrow('db down');
    expect(policy.invalidate).not.toHaveBeenCalled();
  });
});

describe('LivePolicyAdminRepository.createAndActivate', () => {
  it('clears the old active key before inserting max + 1 as the active one, in one transaction', async () => {
    const order: string[] = [];
    const tx = {
      livePolicyVersion: {
        aggregate: vi.fn().mockImplementation(async () => {
          order.push('max');
          return { _max: { version: 4 } };
        }),
        updateMany: vi.fn().mockImplementation(async () => {
          order.push('clear');
          return { count: 1 };
        }),
        create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => {
          order.push('create');
          return data;
        }),
      },
    };
    const prisma = { $transaction: vi.fn((fn: (client: unknown) => unknown) => fn(tx)) };
    const created = await new LivePolicyAdminRepository(prisma as never).createAndActivate(
      validConfig,
      null,
      'a1',
    );
    expect(order).toEqual(['max', 'clear', 'create']);
    expect(tx.livePolicyVersion.updateMany).toHaveBeenCalledWith({
      where: { activeKey: 'active' },
      data: { activeKey: null },
    });
    expect(created).toMatchObject({ version: 5, activeKey: 'active', createdBy: 'a1' });
  });

  it('starts at version 1 on an empty table and reads rows through the helpers', async () => {
    const tx = {
      livePolicyVersion: {
        aggregate: vi.fn().mockResolvedValue({ _max: { version: null } }),
        updateMany: vi.fn(),
        create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
      },
    };
    const model = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    };
    const prisma = {
      $transaction: vi.fn((fn: (client: unknown) => unknown) => fn(tx)),
      livePolicyVersion: model,
    };
    const repository = new LivePolicyAdminRepository(prisma as never);
    expect(await repository.createAndActivate(validConfig, null, null)).toMatchObject({
      version: 1,
    });
    await repository.listRecent(20);
    await repository.findActive();
    await repository.findVersion(3);
    expect(model.findMany).toHaveBeenCalledWith({ orderBy: { version: 'desc' }, take: 20 });
    expect(model.findUnique).toHaveBeenCalledWith({ where: { version: 3 } });
  });
});
