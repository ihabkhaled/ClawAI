import { vi } from 'vitest';

import { Prisma } from '../../../../generated/prisma';
import {
  ObservabilityEntity,
  ObservabilitySortField,
  UsageBillingKind,
} from '../../enums/usage-cost-kind.enum';
import { type ObservabilityScope } from '../../types/admin-observability.types';
import { AdminObservabilityRepository } from '../admin-observability.repository';

const scope: ObservabilityScope = {
  userId: null,
  from: new Date('2026-10-01T00:00:00Z'),
  to: new Date('2026-10-08T00:00:00Z'),
  provider: null,
  model: null,
  workflow: null,
  billing: null,
  plan: null,
};

type Call = [TemplateStringsArray | Prisma.Sql, ...unknown[]];

function flatten(call: Call | undefined): { text: string; values: unknown[] } {
  if (call === undefined) {
    throw new Error('no query recorded');
  }
  const [first, ...parts] = call;
  const sql = Array.isArray(first)
    ? Prisma.sql(first as TemplateStringsArray, ...parts)
    : (first as Prisma.Sql);
  return { text: sql.sql, values: sql.values };
}

function build() {
  const queryRaw = vi.fn().mockResolvedValue([]);
  const executeRaw = vi.fn().mockResolvedValue(0);
  const prisma = {
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    $transaction: vi.fn(async (run: (tx: unknown) => Promise<unknown>) =>
      run({ $queryRaw: queryRaw, $executeRaw: executeRaw }),
    ),
    plan: { findMany: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Pro' }]) },
  };
  return { prisma, queryRaw, executeRaw, repo: new AdminObservabilityRepository(prisma as never) };
}

const lastQuery = (queryRaw: ReturnType<typeof vi.fn>) =>
  flatten(queryRaw.mock.calls.at(-1) as Call | undefined);

describe('AdminObservabilityRepository', () => {
  it('gives Prisma a transaction timeout longer than the statement timeout', async () => {
    const { prisma, repo } = build();
    await repo.totals(scope);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 20_000,
      maxWait: 10_000,
    });
  });

  it('pages a group query with offset and limit as parameters and drops released rows', async () => {
    const { queryRaw, repo } = build();
    await repo.entityPage({
      scope,
      entity: ObservabilityEntity.USER,
      search: null,
      sort: ObservabilitySortField.COST,
      descending: true,
      limit: 25,
      offset: 50,
    });
    const { text, values } = lastQuery(queryRaw);
    expect(text).toContain("w.state <> 'RELEASED'");
    expect(text).toContain('LIMIT');
    expect(text).toContain('OFFSET');
    expect(text).toContain('COUNT(*) OVER ()');
    expect(text).toContain('LEFT JOIN plans pl');
    expect(values).toEqual(expect.arrayContaining([25, 50]));
  });

  it('sorts ascending when asked and uses the cost-per-request expression', async () => {
    const { queryRaw, repo } = build();
    await repo.entityPage({
      scope,
      entity: ObservabilityEntity.PROVIDER,
      search: null,
      sort: ObservabilitySortField.COST_PER_REQUEST,
      descending: false,
      limit: 10,
      offset: 0,
    });
    const { text } = lastQuery(queryRaw);
    expect(text).toContain('NULLIF(COUNT(*), 0)');
    expect(text).toContain('ASC');
    expect(text).not.toContain('DESC');
  });

  it('keeps user search text a parameter and escapes LIKE wildcards', async () => {
    const { queryRaw, repo } = build();
    await repo.entityPage({
      scope,
      entity: ObservabilityEntity.USER,
      search: '50%_off\\x',
      sort: ObservabilitySortField.REQUESTS,
      descending: true,
      limit: 5,
      offset: 0,
    });
    const { text, values } = lastQuery(queryRaw);
    expect(values).toContain('%50\\%\\_off\\\\x%');
    expect(values).toContain('50%_off\\x');
    expect(text).not.toContain('50%_off');
    expect(text).toContain('u.email ILIKE');
  });

  it.each([
    [ObservabilityEntity.PROVIDER, 'k.provider_key ILIKE'],
    [ObservabilityEntity.MODEL, 'w.model ILIKE'],
    [ObservabilityEntity.PLAN, 'pl.name ILIKE'],
    [ObservabilityEntity.WORKFLOW, 'k.workflow_key ILIKE'],
  ])('searches the %s dimension on its own columns', async (entity, fragment) => {
    const { queryRaw, repo } = build();
    await repo.entityPage({
      scope,
      entity,
      search: 'x',
      sort: ObservabilitySortField.REQUESTS,
      descending: true,
      limit: 5,
      offset: 0,
    });
    expect(lastQuery(queryRaw).text).toContain(fragment);
  });

  it('binds every filter, and treats plan NONE as no plan on the row', async () => {
    const { queryRaw, repo } = build();
    await repo.totals({
      ...scope,
      userId: 'u1',
      provider: 'GEMINI',
      model: 'm1',
      workflow: 'CHAT',
      plan: 'plan-1',
      billing: UsageBillingKind.CREDIT,
    });
    const filtered = lastQuery(queryRaw);
    expect(filtered.values).toEqual(
      expect.arrayContaining(['u1', 'GEMINI', 'm1', 'CHAT', 'plan-1']),
    );
    expect(filtered.text).toContain('w.is_payg');
    expect(filtered.text).toContain('COALESCE(w.plan_id, u.active_plan_id) =');

    await repo.totals({ ...scope, plan: 'NONE' });
    const none = lastQuery(queryRaw);
    expect(none.text).toContain('COALESCE(w.plan_id, u.active_plan_id) IS NULL');
    expect(none.values).not.toContain('NONE');
  });

  it.each([
    [UsageBillingKind.ALLOWANCE, 'w.is_free_allowance'],
    [UsageBillingKind.UNMETERED, "u.role::text = 'ADMIN'"],
    [UsageBillingKind.PLAN, "u.role::text <> 'ADMIN'"],
  ])('maps billing %s to its predicate', async (billing, fragment) => {
    const { queryRaw, repo } = build();
    await repo.totals({ ...scope, billing });
    expect(lastQuery(queryRaw).text).toContain(fragment);
  });

  it('returns the first totals row, or undefined when there is none', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ requests: 3 }]);
    expect(await repo.totals(scope)).toEqual({ requests: 3 });
    expect(await repo.totals(scope)).toBeUndefined();
  });

  it('counts groups for a page past the end', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ total: 7 }]);
    expect(await repo.countGroups(scope, { entity: ObservabilityEntity.PLAN, search: 'pro' })).toBe(
      7,
    );
    expect(await repo.countGroups(scope, { entity: ObservabilityEntity.PLAN, search: null })).toBe(
      0,
    );
    expect(lastQuery(queryRaw).text).toContain('GROUP BY');
  });

  it('exports under a statement timeout inside a transaction', async () => {
    const { prisma, executeRaw, queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ group_key: 'u1' }]);
    const rows = await repo.entityExport({
      scope,
      entity: ObservabilityEntity.USER,
      search: null,
      sort: ObservabilitySortField.COST,
      descending: true,
      limit: 5001,
      offset: 0,
    });
    expect(rows).toEqual([{ group_key: 'u1' }]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(lastQuery(queryRaw).values).toContain(5001);
    expect(lastQuery(queryRaw).values).toContain(0);
    expect(flatten(executeRaw.mock.calls[0] as Call).text).toContain(
      'SET LOCAL statement_timeout = 15000',
    );
  });

  it('exports ascending from offset zero whatever offset the caller carried', async () => {
    const { queryRaw, repo } = build();
    await repo.entityExport({
      scope,
      entity: ObservabilityEntity.USER,
      search: null,
      sort: ObservabilitySortField.REQUESTS,
      descending: false,
      limit: 10,
      offset: 40,
    });
    const { text, values } = lastQuery(queryRaw);
    expect(text).toContain('ASC');
    expect(text).not.toContain('DESC');
    expect(values).not.toContain(40);
  });

  it('builds hourly and daily series with distinct active users', async () => {
    const { queryRaw, repo } = build();
    await repo.series(scope, true);
    expect(lastQuery(queryRaw).text).toContain("date_trunc('hour'");
    expect(lastQuery(queryRaw).text).toContain('COUNT(DISTINCT w.user_id)::int AS active_users');
    await repo.series(scope, false);
    expect(lastQuery(queryRaw).text).toContain("date_trunc('day'");
  });

  it('measures first-time users with one per-user first-seen GROUP BY, not a probe per row', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ active_users: 4, first_time_users: 1 }]);
    expect(await repo.people(scope)).toEqual({ active_users: 4, first_time_users: 1 });
    const { text, values } = lastQuery(queryRaw);
    expect(text).toContain('MIN(p.created_at) AS first_seen_at');
    expect(text).toContain('GROUP BY p.user_id');
    expect(text).toContain('p.user_id IN (SELECT user_id FROM active)');
    expect(text).not.toContain('NOT EXISTS');
    expect(values).toContain(scope.from);
    expect(await repo.people(scope)).toBeUndefined();
  });

  it('keys plans by the ledger plan, else the user plan at query time, in key, join and search', async () => {
    const { queryRaw, repo } = build();
    await repo.entityPage({
      scope,
      entity: ObservabilityEntity.PLAN,
      search: 'pro',
      sort: ObservabilitySortField.REQUESTS,
      descending: true,
      limit: 5,
      offset: 0,
    });
    const { text } = lastQuery(queryRaw);
    expect(text).toContain("COALESCE(w.plan_id, u.active_plan_id, 'NONE') AS group_key");
    expect(text).toContain('LEFT JOIN plans pl ON pl.id = COALESCE(w.plan_id, u.active_plan_id)');
    expect(text).toContain('MAX(COALESCE(w.plan_id, u.active_plan_id)) AS plan_id');
    expect(text).toContain('pl.name ILIKE');
    await repo.counts(scope);
    expect(lastQuery(queryRaw).text).toContain(
      "COUNT(DISTINCT COALESCE(w.plan_id, u.active_plan_id, 'NONE'))",
    );
  });

  it('runs every window read under a statement timeout in its own transaction', async () => {
    const { prisma, executeRaw, repo } = build();
    const reads: Array<() => Promise<unknown>> = [
      () => repo.totals(scope),
      () =>
        repo.entityPage({
          scope,
          entity: ObservabilityEntity.USER,
          search: null,
          sort: ObservabilitySortField.COST,
          descending: true,
          limit: 5,
          offset: 0,
        }),
      () => repo.countGroups(scope, { entity: ObservabilityEntity.USER, search: null }),
      () => repo.series(scope, true),
      () => repo.people(scope),
      () => repo.newSignups(scope.from, scope.to),
      () => repo.signupsSeries(scope.from, scope.to, true),
      () => repo.counts(scope),
      () => repo.hourOfDay(scope),
      () => repo.dayOfWeek(scope),
      () => repo.billingSplit(scope),
      () => repo.health(scope, null),
      () => repo.providerOptions(scope),
      () => repo.modelOptions(scope),
      () => repo.workflowOptions(scope),
    ];
    for (const read of reads) {
      await read();
    }
    expect(prisma.$transaction).toHaveBeenCalledTimes(reads.length);
    expect(executeRaw).toHaveBeenCalledTimes(reads.length);
    expect(flatten(executeRaw.mock.calls[0] as Call).text).toContain(
      'SET LOCAL statement_timeout = 15000',
    );
  });

  it('lets a cancelled (timed out) statement reject the read', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockRejectedValueOnce(new Error('canceling statement due to statement timeout'));
    await expect(repo.totals(scope)).rejects.toThrow('statement timeout');
  });

  it('does not wait for a query when the timeout statement itself fails', async () => {
    const { executeRaw, queryRaw, repo } = build();
    executeRaw.mockRejectedValueOnce(new Error('connection lost'));
    await expect(repo.series(scope, false)).rejects.toThrow('connection lost');
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('counts signups without any usage filter', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ total: 9 }]);
    expect(await repo.newSignups(scope.from, scope.to)).toBe(9);
    expect(await repo.newSignups(scope.from, scope.to)).toBe(0);
    expect(lastQuery(queryRaw).text).toContain('FROM users');
    await repo.signupsSeries(scope.from, scope.to, false);
    expect(lastQuery(queryRaw).text).toContain("date_trunc('day'");
    await repo.signupsSeries(scope.from, scope.to, true);
    expect(lastQuery(queryRaw).text).toContain("date_trunc('hour'");
  });

  it('reads the distinct counts, the activity buckets and the billing split', async () => {
    const { queryRaw, repo } = build();
    queryRaw.mockResolvedValueOnce([{ providers: 2, models: 5, plans: 3, workflows: 4 }]);
    expect(await repo.counts(scope)).toMatchObject({ models: 5 });
    await repo.hourOfDay(scope);
    expect(lastQuery(queryRaw).text).toContain('EXTRACT(HOUR FROM w.created_at)');
    await repo.dayOfWeek(scope);
    expect(lastQuery(queryRaw).text).toContain('EXTRACT(ISODOW FROM w.created_at)');
    await repo.billingSplit(scope);
    expect(lastQuery(queryRaw).text).toContain("WHEN w.is_payg THEN 'CREDIT'");
  });

  it('computes health over released rows too, for the listed keys only', async () => {
    const { queryRaw, executeRaw, repo } = build();
    await repo.health(scope, { entity: ObservabilityEntity.PROVIDER, keys: ['A', 'B'], limit: 2 });
    const { text, values } = lastQuery(queryRaw);
    expect(text).not.toContain("w.state <> 'RELEASED'");
    expect(text).toContain("w.state = 'RELEASED'");
    expect(text).toContain('percentile_cont(0.95)');
    expect(text).toContain('w.request_id <> w.reservation_id');
    expect(text).toContain("COUNT(*) FILTER (WHERE w.state = 'FINALIZED')::int AS finalized");
    expect(text).toContain("COUNT(*) FILTER (WHERE w.state = 'RELEASED')::int AS released");
    expect(text).toContain('= ANY(');
    expect(text).toContain("interval '15 minutes'");
    expect(values).toContainEqual(['A', 'B']);
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('ranks groups by refunded holds when no keys are given, and has one row ungrouped', async () => {
    const { queryRaw, repo } = build();
    await repo.health(scope, { entity: ObservabilityEntity.PROVIDER, keys: null, limit: 20 });
    expect(lastQuery(queryRaw).text).toContain(
      "ORDER BY COUNT(*) FILTER (WHERE w.state = 'RELEASED') DESC",
    );
    expect(lastQuery(queryRaw).text).not.toContain('= ANY(');
    await repo.health(scope, null);
    expect(lastQuery(queryRaw).text).not.toContain('GROUP BY');
    expect(lastQuery(queryRaw).text).toContain('NULL::text AS group_key');
  });

  it('lists the filter options within the window and the plans from the table', async () => {
    const { queryRaw, prisma, repo } = build();
    await repo.providerOptions(scope);
    expect(lastQuery(queryRaw).text).toContain('k.provider_key AS value');
    await repo.modelOptions(scope);
    expect(lastQuery(queryRaw).text).toContain('w.model AS value');
    await repo.workflowOptions(scope);
    expect(lastQuery(queryRaw).text).toContain('k.workflow_key AS value');
    expect(await repo.planOptions()).toEqual([{ id: 'p1', name: 'Pro' }]);
    expect(prisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200, select: { id: true, name: true } }),
    );
  });
});
