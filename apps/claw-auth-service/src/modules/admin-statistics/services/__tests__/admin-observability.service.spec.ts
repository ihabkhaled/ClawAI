import { vi } from 'vitest';

import { EMPTY_OBS_SUMS_ROW } from '../../constants/admin-observability.constants';
import { ObservabilityEntity, ObservabilitySortField } from '../../enums/usage-cost-kind.enum';
import { emptyGroupRow } from '../../utilities/admin-observability-mapper.utility';
import { AdminObservabilityService } from '../admin-observability.service';

const NOW = new Date('2026-10-10T12:00:00.000Z');

function groupRow(key: string, over: Record<string, unknown> = {}) {
  return {
    ...emptyGroupRow(key, null, null),
    ...EMPTY_OBS_SUMS_ROW,
    requests: 2,
    actual_micro_usd: '100',
    total_groups: 3,
    email: `${key}@example.com`,
    username: key,
    ...over,
  };
}

function healthRow(key: string | null, over: Record<string, unknown> = {}) {
  return {
    group_key: key,
    finalized: 9,
    released: 1,
    in_flight: 0,
    stale_reserved: 0,
    avg_ms: 10,
    p50_ms: 9,
    p95_ms: 30,
    ...over,
  };
}

function build() {
  const repository = {
    totals: vi
      .fn()
      .mockResolvedValue({ ...EMPTY_OBS_SUMS_ROW, requests: 10, actual_micro_usd: '1000' }),
    entityPage: vi.fn().mockResolvedValue([]),
    countGroups: vi.fn().mockResolvedValue(0),
    entityExport: vi.fn().mockResolvedValue([]),
    series: vi.fn().mockResolvedValue([]),
    people: vi.fn().mockResolvedValue({ active_users: 4, first_time_users: 1 }),
    newSignups: vi.fn().mockResolvedValue(7),
    signupsSeries: vi.fn().mockResolvedValue([]),
    counts: vi.fn().mockResolvedValue({ providers: 2, models: 5, plans: 3, workflows: 4 }),
    hourOfDay: vi.fn().mockResolvedValue([]),
    dayOfWeek: vi.fn().mockResolvedValue([]),
    billingSplit: vi.fn().mockResolvedValue([]),
    health: vi.fn().mockResolvedValue([healthRow(null)]),
    providerOptions: vi.fn().mockResolvedValue([{ value: 'LOCAL_OLLAMA' }]),
    modelOptions: vi.fn().mockResolvedValue([{ value: 'm1' }]),
    workflowOptions: vi.fn().mockResolvedValue([{ value: 'CHAT' }]),
    planOptions: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Pro' }]),
  };
  const audit = {
    recordListed: vi.fn().mockResolvedValue(undefined),
    recordExported: vi.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    audit,
    service: new AdminObservabilityService(repository as never, audit as never),
  };
}

const list = { order: 'desc' as const, page: 1, limit: 2, sort: ObservabilitySortField.COST };

describe('AdminObservabilityService', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists every user page with the full email, page count and an audit event', async () => {
    const { repository, audit, service } = build();
    repository.entityPage.mockResolvedValue([groupRow('a'), groupRow('b')]);
    repository.health.mockResolvedValue([healthRow('a'), healthRow('b', { released: 0 })]);

    const page = await service.listUsers(
      { ...list, sort: ObservabilitySortField.LAST_SEEN },
      'admin-1',
    );

    expect(page.items.map((row) => row.email)).toEqual(['a@example.com', 'b@example.com']);
    expect(page.total).toBe(3);
    expect(page.pageCount).toBe(2);
    expect(page.items[0]?.health?.refundRate).toBe(0.1);
    expect(page.items[1]?.health?.refundRate).toBe(0);
    expect(page.totals.metrics.requests).toBe(10);
    expect(repository.entityPage).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 2, descending: true, search: null }),
    );
    expect(audit.recordListed).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ hasSearch: false, page: 1, limit: 2, rows: 2 }),
    );
    expect(JSON.stringify(audit.recordListed.mock.calls)).not.toContain('@example.com');
  });

  it('computes the offset from the page and audits every page, not only the first', async () => {
    const { repository, audit, service } = build();
    repository.entityPage.mockResolvedValue([groupRow('c')]);
    await service.listUsers({ ...list, page: 3, search: 'jane' }, 'admin-1');
    expect(repository.entityPage).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 4, search: 'jane' }),
    );
    expect(audit.recordListed).toHaveBeenCalledTimes(1);
    expect(audit.recordListed).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ page: 3, limit: 2, hasSearch: true, rows: 1 }),
    );
    await service.listUsers({ ...list, page: 4 }, 'admin-1');
    await service.listUsers({ ...list, page: 1 }, 'admin-1');
    expect(audit.recordListed).toHaveBeenCalledTimes(3);
  });

  it('audits a search and a past-the-end page, and never writes an address into the trail', async () => {
    const { repository, audit, service } = build();
    repository.countGroups.mockResolvedValue(5);
    await service.listUsers({ ...list, page: 9, search: 'jane' }, 'admin-1');
    for (const call of audit.recordListed.mock.calls) {
      expect(call[1]).not.toHaveProperty('search');
    }
    expect(audit.recordListed).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ page: 9, hasSearch: true, rows: 0 }),
    );
    repository.entityPage.mockResolvedValue([groupRow('a')]);
    await service.listUsers(list, 'admin-1');
    expect(JSON.stringify(audit.recordListed.mock.calls)).not.toContain('@example.com');
  });

  it('counts the groups separately when a page past the end comes back empty', async () => {
    const { repository, service } = build();
    repository.countGroups.mockResolvedValue(5);
    const page = await service.listUsers({ ...list, page: 9 }, 'admin-1');
    expect(page.items).toEqual([]);
    expect(page.total).toBe(5);
    expect(repository.health).not.toHaveBeenCalled();

    const first = await service.listUsers({ ...list, page: 1 }, 'admin-1');
    expect(first.total).toBe(0);
    expect(first.pageCount).toBe(0);
  });

  it('masks emails on every non-user list and exposes no email field value', async () => {
    const { repository, service } = build();
    repository.entityPage.mockResolvedValue([
      groupRow('LOCAL_OLLAMA', { raw_provider: 'local-ollama' }),
    ]);
    const page = await service.listProviders(list);
    expect(page.items[0]).toMatchObject({ kind: 'PROVIDER', email: null, label: 'Local Ollama' });
    await service.listModels(list);
    await service.listPlans(list);
    await service.listWorkflows(list);
    expect(repository.entityPage.mock.calls.map(([query]) => query.entity)).toEqual([
      ObservabilityEntity.PROVIDER,
      ObservabilityEntity.MODEL,
      ObservabilityEntity.PLAN,
      ObservabilityEntity.WORKFLOW,
    ]);
  });

  it('normalises the provider filter and passes plan, user and range to the scope', async () => {
    const { repository, service } = build();
    await service.listModels({
      ...list,
      provider: 'local-ollama',
      plan: 'NONE',
      userId: 'u9',
      model: 'm',
      workflow: 'CHAT',
      hours: 24,
    });
    const scope = repository.entityPage.mock.calls[0]?.[0].scope;
    expect(scope).toMatchObject({
      provider: 'LOCAL_OLLAMA',
      plan: 'NONE',
      userId: 'u9',
      model: 'm',
      workflow: 'CHAT',
    });
    expect(scope.to.toISOString()).toBe(NOW.toISOString());
    expect(scope.from.toISOString()).toBe('2026-10-09T12:00:00.000Z');
  });

  it('exports with the cap, flags truncation, and audits without the search text', async () => {
    const { repository, audit, service } = build();
    const rows = Array.from({ length: 5001 }, (_, index) =>
      groupRow(`u${index}`, { total_groups: 9000 }),
    );
    repository.entityExport.mockResolvedValue(rows);
    const out = await service.exportUsers(
      { order: 'asc', sort: ObservabilitySortField.REQUESTS, search: 'jane' },
      'admin-1',
    );
    expect(out.items).toHaveLength(5000);
    expect(out.truncated).toBe(true);
    expect(out.total).toBe(9000);
    expect(out.items[0]?.email).toBe('u0@example.com');
    expect(repository.entityExport).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5001, offset: 0, descending: false }),
    );
    expect(audit.recordExported).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ rows: 5000, hasSearch: true }),
    );
  });

  it('exports an empty match without truncation', async () => {
    const { service } = build();
    const out = await service.exportUsers(
      { order: 'desc', sort: ObservabilitySortField.COST },
      'a',
    );
    expect(out).toMatchObject({ items: [], truncated: false, total: 0 });
  });

  it('builds the hub overview with deltas against the previous equal window', async () => {
    const { repository, service } = build();
    repository.totals
      .mockResolvedValueOnce({
        ...EMPTY_OBS_SUMS_ROW,
        requests: 30,
        input_tokens: 600n,
        output_tokens: 400n,
        actual_micro_usd: '3000',
        tool_calls: 9n,
      })
      .mockResolvedValueOnce({
        ...EMPTY_OBS_SUMS_ROW,
        requests: 20,
        input_tokens: 300n,
        output_tokens: 200n,
        actual_micro_usd: '1000',
        tool_calls: 0n,
      });
    repository.people
      .mockResolvedValueOnce({ active_users: 6, first_time_users: 2 })
      .mockResolvedValueOnce({ active_users: 3, first_time_users: 0 });
    repository.hourOfDay.mockResolvedValue([{ bucket: 5, requests: 2, cost_micro_usd: '7' }]);
    repository.series.mockResolvedValue([
      {
        ...EMPTY_OBS_SUMS_ROW,
        requests: 4,
        bucket_start: new Date('2026-10-09T00:00:00Z'),
        active_users: 1,
      },
    ]);
    repository.signupsSeries.mockResolvedValue([
      { bucket_start: new Date('2026-10-09T00:00:00Z'), total: 7 },
    ]);
    repository.billingSplit.mockResolvedValue([
      { billing: 'PLAN', requests: 30, cost_micro_usd: '3000' },
    ]);

    const overview = await service.overview({ hours: 168 });

    expect(overview.grain).toBe('HOUR');
    expect(overview.previousTo).toBe(overview.from);
    expect(new Date(overview.to).getTime() - new Date(overview.from).getTime()).toBe(
      new Date(overview.previousTo).getTime() - new Date(overview.previousFrom).getTime(),
    );
    expect(overview.deltas.requests).toEqual({ current: '30', previous: '20', changePct: 50 });
    expect(overview.deltas.costMicroUsd.changePct).toBe(200);
    expect(overview.deltas.tokens).toEqual({ current: '1000', previous: '500', changePct: 100 });
    expect(overview.deltas.toolCalls.changePct).toBeNull();
    expect(overview.deltas.activeUsers.changePct).toBe(100);
    expect(overview).toMatchObject({
      activeUsers: 6,
      firstTimeUsers: 2,
      newSignups: 7,
      counts: { providers: 2, models: 5, plans: 3, workflows: 4 },
    });
    expect(overview.hourOfDay).toHaveLength(24);
    expect(overview.dayOfWeek).toHaveLength(7);
    expect(overview.signupsSeries).toHaveLength(168);
    expect(overview.series).toHaveLength(168);
    expect(overview.series.filter((point) => point.requests === 0)).toHaveLength(167);
    expect(overview.signupsSeries.find((point) => point.count > 0)).toEqual({
      bucketStart: '2026-10-09T00:00:00.000Z',
      count: 7,
    });
    expect(overview.billingSplit).toHaveLength(1);
    expect(overview.health.settleRate).toBe(0.9);
    expect(repository.newSignups).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    expect(repository.signupsSeries).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), true);
  });

  it('uses a daily grain beyond a week and tolerates an empty database', async () => {
    const { repository, service } = build();
    repository.totals.mockResolvedValue(undefined);
    repository.people.mockResolvedValue(undefined);
    repository.counts.mockResolvedValue(undefined);
    repository.health.mockResolvedValue([]);
    const overview = await service.overview({ hours: 720 });
    expect(overview.grain).toBe('DAY');
    expect(overview.series).toHaveLength(31);
    expect(overview.series.every((point) => point.requests === 0)).toBe(true);
    expect(overview.signupsSeries).toHaveLength(31);
    expect(overview.activeUsers).toBe(0);
    expect(overview.counts).toEqual({ providers: 0, models: 0, plans: 0, workflows: 0 });
    expect(overview.totals.metrics.requests).toBe(0);
    expect(overview.health.settleRate).toBeNull();
    expect(overview.deltas.requests.changePct).toBeNull();
  });

  it('builds the provider detail with masked users and its model breakdown', async () => {
    const { repository, service } = build();
    repository.entityPage.mockImplementation(
      async (query: { entity: ObservabilityEntity; limit: number }) => {
        switch (query.entity) {
          case ObservabilityEntity.PROVIDER:
            return [groupRow('GEMINI', { raw_provider: 'gemini' })];
          case ObservabilityEntity.USER:
            return Array.from({ length: query.limit }, (_, index) => groupRow(`u${index}`));
          case ObservabilityEntity.MODEL:
            return [groupRow('GEMINI/g1', { raw_provider: 'gemini', model: 'g1' })];
          default:
            return [];
        }
      },
    );
    repository.health.mockResolvedValue([healthRow(null, { released: 2 })]);

    const detail = await service.providerDetail('gemini', {});

    expect(detail.entity).toMatchObject({
      key: 'GEMINI',
      kind: 'PROVIDER',
      label: 'Google Gemini',
    });
    expect(detail.entity.health?.released).toBe(2);
    expect(detail.models.map((row) => row.model)).toEqual(['g1']);
    expect(detail.providers).toEqual([]);
    expect(detail.users).toHaveLength(50);
    expect(detail.users.every((row) => row.email === null)).toBe(true);
    expect(detail.truncated).toBe(true);
    expect(repository.totals).toHaveBeenCalledWith(expect.objectContaining({ provider: null }));
    expect(repository.entityPage.mock.calls[0]?.[0].scope.provider).toBe('GEMINI');
  });

  it('builds a model detail even when the model has no usage in the window', async () => {
    const { repository, service } = build();
    repository.totals.mockResolvedValue(undefined);
    repository.health.mockResolvedValue([]);
    const detail = await service.modelDetail({ provider: 'gemini', model: 'g1' });
    expect(detail.entity).toMatchObject({ key: 'GEMINI/g1', kind: 'MODEL', model: 'g1' });
    expect(detail.entity.metrics.requests).toBe(0);
    expect(detail.entity.health).toBeNull();
    expect(detail.truncated).toBe(false);
    expect(detail.models).toEqual([]);
  });

  it('builds a provider detail with no usage as a zero row', async () => {
    const { repository, service } = build();
    repository.totals.mockResolvedValue(undefined);
    const detail = await service.providerDetail('nobody', {});
    expect(detail.entity).toMatchObject({ key: 'NOBODY', kind: 'PROVIDER' });
  });

  it('lists filter options from the window alone, with plans from the table', async () => {
    const { repository, service } = build();
    const options = await service.filterOptions({ hours: 24, provider: 'x', plan: 'p9' } as never);
    expect(options).toEqual({
      providers: [{ value: 'LOCAL_OLLAMA', label: 'Local Ollama' }],
      models: ['m1'],
      workflows: ['CHAT'],
      plans: [{ value: 'p1', label: 'Pro' }],
    });
    expect(repository.providerOptions.mock.calls[0]?.[0]).toMatchObject({
      provider: null,
      plan: null,
    });
  });

  it('reports a provider with no name as an empty key', async () => {
    const { repository, service } = build();
    repository.health
      .mockResolvedValueOnce([healthRow(null)])
      .mockResolvedValueOnce([healthRow(null, { released: 3 })]);
    const report = await service.healthReport({});
    expect(report.byProvider).toHaveLength(1);
    expect(report.byProvider[0]?.key).toBe('');
  });

  it('reports refunded holds overall and per provider', async () => {
    const { repository, service } = build();
    repository.health
      .mockResolvedValueOnce([healthRow(null, { finalized: 8, released: 2 })])
      .mockResolvedValueOnce([healthRow('LOCAL_OLLAMA', { released: 5 })]);
    const report = await service.healthReport({});
    expect(report.overall.refundRate).toBe(0.2);
    expect(report.byProvider).toEqual([
      expect.objectContaining({ key: 'LOCAL_OLLAMA', label: 'Local Ollama' }),
    ]);
    expect(repository.health).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ entity: ObservabilityEntity.PROVIDER, keys: null, limit: 20 }),
    );
  });

  describe('read batching', () => {
    /** Every repository read waits on one gate, so the number of started reads shows the fan-out. */
    function gated() {
      const built = build();
      let open: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      for (const read of Object.values(built.repository)) {
        const original = read.getMockImplementation();
        read.mockImplementation(async (...args: unknown[]) => {
          await gate;
          return original?.(...args);
        });
      }
      const started = (): number =>
        Object.values(built.repository).reduce((sum, read) => sum + read.mock.calls.length, 0);
      const flush = async (): Promise<void> => {
        for (let index = 0; index < 10; index += 1) {
          await Promise.resolve();
        }
      };
      return { ...built, open, started, flush };
    }

    it('runs the overview as two batches of six reads', async () => {
      const { service, open, started, flush } = gated();
      const pending = service.overview({ hours: 24 });
      await flush();
      expect(started()).toBe(6);
      open();
      await pending;
      expect(started()).toBe(12);
    });

    it('runs a detail page as two batches of six (the provider page skips one split)', async () => {
      const { service, open, started, flush } = gated();
      const pending = service.providerDetail('gemini', {});
      await flush();
      expect(started()).toBe(6);
      open();
      await pending;
      expect(started()).toBe(11);
    });
  });
});
