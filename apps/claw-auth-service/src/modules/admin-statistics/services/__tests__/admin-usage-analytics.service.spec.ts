import { vi } from 'vitest';
import { AdminUsageAnalyticsService } from '../admin-usage-analytics.service';

const SUMS = {
  requests: 2,
  input_tokens: 100n,
  output_tokens: 40n,
  weighted_tokens: 150n,
  cost_micro_usd: '1234',
  tool_calls: 3n,
};

describe('AdminUsageAnalyticsService', () => {
  const NOW = new Date('2026-10-05T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function build(policyLimit: number | null | 'none', used = 4) {
    const repository = {
      totals: vi.fn().mockResolvedValue(SUMS),
      creditSums: vi
        .fn()
        .mockResolvedValue({ credit_requests: 3, free_requests: 2, wallet_micro_usd: '500' }),
      activeUsers: vi.fn().mockResolvedValue(7),
      byModel: vi.fn().mockResolvedValue([
        {
          ...SUMS,
          provider: 'OPENAI',
          model: 'gpt-x',
          credit_requests: 1,
          free_requests: 1,
          wallet_micro_usd: '10',
        },
      ]),
      byUser: vi.fn().mockResolvedValue([{ ...SUMS, user_id: 'u1' }]),
      byWorkflow: vi.fn().mockResolvedValue([{ workflow: null, requests: 2 }]),
      series: vi
        .fn()
        .mockResolvedValue([{ ...SUMS, bucket_start: new Date('2026-10-05T11:00:00Z') }]),
      tools: vi.fn().mockResolvedValue([{ feature: 'WEB_SEARCH', count: 5 }]),
      emailsFor: vi.fn().mockResolvedValue(new Map([['u1', 'jane.doe@example.com']])),
    };
    const allowance = {
      resolvePolicy: vi
        .fn()
        .mockResolvedValue(policyLimit === 'none' ? null : { limit: policyLimit }),
    };
    const counters = { findTotalUsed: vi.fn().mockResolvedValue(used) };
    const service = new AdminUsageAnalyticsService(
      repository as never,
      allowance as never,
      counters as never,
    );
    return { service, repository };
  }

  it('reports models, tools, credit use and the remaining free allowance for one user', async () => {
    const { service, repository } = build(10, 4);

    const result = await service.getUserBreakdown('u1', {});

    expect(repository.byModel.mock.calls[0]?.[0]).toMatchObject({ userId: 'u1' });
    expect(result.models[0]).toMatchObject({ provider: 'OPENAI', model: 'gpt-x', requests: 2 });
    expect(result.models[0]?.costMicroUsd).toBe('1234');
    expect(result.tools).toEqual([{ tool: 'WEB_SEARCH', count: 5 }]);
    expect(result.toolCallCount).toBe(3);
    expect(result.workflows).toEqual([{ workflow: 'UNKNOWN', requests: 2 }]);
    expect(result.creditConnector).toMatchObject({
      usedCreditConnectors: true,
      creditRequests: 3,
      freeAllowanceRequests: 2,
      walletMicroUsd: '500',
      freeAllowance: { periodKey: '2026-10', limit: 10, used: 4, remaining: 6 },
    });
  });

  it('keeps null (unlimited) and 0 (disabled) distinct for the allowance', async () => {
    const unlimited = await build(null).service.getUserBreakdown('u1', {});
    expect(unlimited.creditConnector.freeAllowance).toMatchObject({ limit: null, remaining: null });

    const disabled = await build('none', 0).service.getUserBreakdown('u1', {});
    expect(disabled.creditConnector.freeAllowance).toMatchObject({ limit: 0, remaining: 0 });
  });

  it('never reports negative remaining when usage passes the limit', async () => {
    const result = await build(10, 12).service.getUserBreakdown('u1', {});
    expect(result.creditConnector.freeAllowance?.remaining).toBe(0);
  });

  it('flags a truncated model list', async () => {
    const { service, repository } = build(10);
    const row = {
      ...SUMS,
      provider: 'P',
      model: 'm',
      credit_requests: 0,
      free_requests: 0,
      wallet_micro_usd: '0',
    };
    repository.byModel.mockResolvedValue(Array.from({ length: 51 }, () => row));
    const result = await service.getUserBreakdown('u1', {});
    expect(result.models).toHaveLength(50);
    expect(result.modelsTruncated).toBe(true);
  });

  it('builds the admin-wide overview with masked top users and a today block', async () => {
    const { service, repository } = build(10);

    const result = await service.getOverview({ hours: 6, limit: 5 });

    expect(result.grain).toBe('HOUR');
    expect(result.activeUsers).toBe(7);
    expect(result.today.costMicroUsd).toBe('1234');
    expect(result.series[0]?.bucketStart).toBe('2026-10-05T11:00:00.000Z');
    expect(result.topUsers[0]).toMatchObject({ userId: 'u1', maskedEmail: 'ja***@example.com' });
    expect(JSON.stringify(result)).not.toContain('jane.doe');
    expect(repository.byModel).toHaveBeenCalledWith(expect.anything(), 5);
    expect(repository.totals.mock.calls[1]?.[0].from.toISOString()).toBe(
      '2026-10-05T00:00:00.000Z',
    );
  });

  it('skips the top-users list when filtered to one user', async () => {
    const { service, repository } = build(10);
    const result = await service.getOverview({ userId: 'u1', limit: 10 });
    expect(repository.byUser).not.toHaveBeenCalled();
    expect(result.topUsers).toEqual([]);
    expect(result.userId).toBe('u1');
  });
});
