import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';

import { EMPTY_EXPLORER_SUMS_ROW } from '../../constants/admin-usage-explorer.constants';
import {
  UsageBillingKind,
  UsageLeaderboardDimension,
  UsageSortField,
} from '../../enums/usage-cost-kind.enum';
import { encodeCursor } from '../../utilities/usage-cursor.utility';
import { AdminUsageAuditService } from '../admin-usage-audit.service';
import { AdminUsageExplorerService } from '../admin-usage-explorer.service';

const NOW = new Date('2026-10-05T12:00:00.000Z');

function userRow(id: string, sort: string) {
  return {
    ...EMPTY_EXPLORER_SUMS_ROW,
    group_key: id,
    sort_val: sort,
    email: `${id}@example.com`,
    username: id,
    role: 'USER',
    raw_provider: null,
    model: null,
    requests: 1,
  };
}

function build() {
  const repository = {
    groupPage: vi.fn().mockResolvedValue([]),
    distinctUsers: vi.fn().mockResolvedValue(0),
    totals: vi.fn().mockResolvedValue(undefined),
    series: vi.fn().mockResolvedValue([]),
    requestPage: vi.fn().mockResolvedValue([]),
    providerOptions: vi.fn().mockResolvedValue([{ value: 'LOCAL_OLLAMA' }]),
    modelOptions: vi.fn().mockResolvedValue([{ value: 'm1' }]),
    workflowOptions: vi.fn().mockResolvedValue([{ value: 'CHAT' }]),
    findUserIdentity: vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'jane.doe@example.com',
      username: 'jane',
      role: 'USER',
      status: 'ACTIVE',
    }),
  };
  const audit = {
    recordViewed: vi.fn().mockResolvedValue(undefined),
    recordExported: vi.fn().mockResolvedValue(undefined),
    recordListed: vi.fn().mockResolvedValue(undefined),
  };
  const service = new AdminUsageExplorerService(repository as never, audit as never);
  return { repository, audit, service };
}

const baseQuery = { order: 'desc' as const, limit: 2, sort: UsageSortField.COST };

describe('AdminUsageExplorerService', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists users with the full email and a cursor when more rows exist', async () => {
    const { repository, service } = build();
    repository.groupPage.mockResolvedValue([
      userRow('a', '30'),
      userRow('b', '20'),
      userRow('c', '10'),
    ]);
    repository.distinctUsers.mockResolvedValue(3);

    const page = await service.listUsers(baseQuery, 'admin-1');

    expect(page.items.map((row) => row.email)).toEqual(['a@example.com', 'b@example.com']);
    expect(page.nextCursor).toBe(encodeCursor('20', 'b'));
    expect(page.matchedUsers).toBe(3);
    expect(repository.groupPage.mock.calls[0]?.[0]).toMatchObject({ limit: 3, descending: true });
  });

  it('returns no cursor on the last page and passes search through', async () => {
    const { repository, service } = build();
    repository.groupPage.mockResolvedValue([userRow('a', '30')]);
    const page = await service.listUsers({ ...baseQuery, search: 'jane' }, 'admin-1');
    expect(page.nextCursor).toBeNull();
    expect(repository.groupPage.mock.calls[0]?.[0]).toMatchObject({ search: 'jane' });
  });

  it('audits the first users page without email or search text, and skips cursor pages', async () => {
    const { repository, audit, service } = build();
    repository.groupPage.mockResolvedValue([userRow('a', '30')]);

    await service.listUsers({ ...baseQuery, search: 'jane@example.com' }, 'admin-1');
    expect(audit.recordListed).toHaveBeenCalledTimes(1);
    const [actor, filters] = audit.recordListed.mock.calls[0] ?? [];
    expect(actor).toBe('admin-1');
    expect(filters).toMatchObject({ hasSearch: true, rows: 1 });
    expect(JSON.stringify(audit.recordListed.mock.calls)).not.toMatch(/example\.com|jane/);

    await service.listUsers({ ...baseQuery, cursor: encodeCursor('20', 'b') }, 'admin-1');
    expect(audit.recordListed).toHaveBeenCalledTimes(1);
  });

  it('audits only the user-dimension leaderboard, first page only', async () => {
    const { repository, audit, service } = build();
    repository.groupPage.mockResolvedValue([userRow('a', '30')]);
    const query = { ...baseQuery, dimension: UsageLeaderboardDimension.USER };

    await service.leaderboard(query, 'admin-1');
    expect(audit.recordListed).toHaveBeenCalledTimes(1);

    await service.leaderboard({ ...query, cursor: encodeCursor('20', 'b') }, 'admin-1');
    await service.leaderboard({ ...query, dimension: UsageLeaderboardDimension.MODEL }, 'admin-1');
    expect(audit.recordListed).toHaveBeenCalledTimes(1);
  });

  it('normalises the provider filter before it reaches the repository', async () => {
    const { repository, service } = build();
    await service.timeseries({
      provider: 'local-ollama',
      billing: UsageBillingKind.CREDIT,
    });
    expect(repository.totals.mock.calls[0]?.[0]).toMatchObject({
      provider: 'LOCAL_OLLAMA',
      billing: UsageBillingKind.CREDIT,
    });
  });

  it('audits a user open with ids and filters, and never the email', async () => {
    const { audit, service } = build();
    const detail = await service.userDetail('u1', { provider: 'CLAW' }, 'admin-1');

    expect(detail.user.email).toBe('jane.doe@example.com');
    expect(detail.filterOptions.providers).toEqual([
      { value: 'LOCAL_OLLAMA', label: 'Local Ollama' },
    ]);
    expect(audit.recordViewed).toHaveBeenCalledTimes(1);
    const [actor, target, filters] = audit.recordViewed.mock.calls[0] ?? [];
    expect(actor).toBe('admin-1');
    expect(target).toBe('u1');
    expect(filters).toMatchObject({ provider: 'CLAW' });
    expect(JSON.stringify(audit.recordViewed.mock.calls)).not.toContain('jane.doe@example.com');
  });

  it('404s and does not audit an unknown user', async () => {
    const { repository, audit, service } = build();
    repository.findUserIdentity.mockResolvedValue(null);
    await expect(service.userDetail('nope', {}, 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(audit.recordViewed).not.toHaveBeenCalled();
  });

  it('audits only the first request page, not each following one', async () => {
    const { audit, service } = build();
    await service.userRequests('u1', { ...baseQuery, sort: 'time' as never }, 'admin-1');
    await service.userRequests(
      'u1',
      { ...baseQuery, sort: 'time' as never, cursor: encodeCursor('5', 'r1') },
      'admin-1',
    );
    expect(audit.recordViewed).toHaveBeenCalledTimes(1);
  });

  it('audits an export with the row count and caps it', async () => {
    const { repository, audit, service } = build();
    repository.groupPage.mockResolvedValue([userRow('a', '1'), userRow('b', '1')]);
    const result = await service.exportUsers({ order: 'desc', limit: 25 }, 'admin-1');
    expect(result.items).toHaveLength(2);
    expect(result.truncated).toBe(false);
    expect(audit.recordExported).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ rows: 2 }),
    );
  });

  it('rejects a window wider than 90 days', async () => {
    const { service } = build();
    await expect(service.timeseries({ from: '2026-01-01T00:00:00Z' })).rejects.toThrow(/90 days/);
  });
});

describe('AdminUsageAuditService', () => {
  it('publishes ids and filters and swallows a broker failure', async () => {
    const rabbitmq = { publish: vi.fn().mockRejectedValue(new Error('down')) };
    const audit = new AdminUsageAuditService(rabbitmq as never);
    await expect(audit.recordViewed('a1', 'u1', { provider: null })).resolves.toBeUndefined();
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      'admin.usage.viewed',
      expect.objectContaining({ actorUserId: 'a1', targetUserId: 'u1' }),
    );
    await audit.recordExported('a1', { rows: 3 });
    expect(rabbitmq.publish).toHaveBeenLastCalledWith(
      'admin.usage.exported',
      expect.objectContaining({ targetUserId: null }),
    );
  });
});
