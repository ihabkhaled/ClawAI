import { EMPTY_OBS_SUMS_ROW } from '../../constants/admin-observability.constants';
import { ObservabilityEmailMode, ObservabilityEntity } from '../../enums/usage-cost-kind.enum';
import { type ObservabilityGroupRow } from '../../types/admin-observability.types';
import {
  divideHalfUp,
  emptyDetailRow,
  emptyGroupRow,
  shareBaseOf,
  toBillingSplit,
  toDayOfWeek,
  toEntityRow,
  toFilledSeries,
  toFilledSignups,
  toHourOfDay,
  toKpiDelta,
  toObsDerived,
  toObsHealth,
  toObsMetrics,
  toObsSeriesPoint,
  toObsStats,
  toSignupPoint,
  totalCostMicroUsd,
} from '../admin-observability-mapper.utility';

const sums = {
  ...EMPTY_OBS_SUMS_ROW,
  requests: 3,
  input_tokens: 2000n,
  output_tokens: 1000n,
  cached_tokens: 500n,
  cache_write_tokens: 500n,
  reasoning_tokens: 250n,
  tool_calls: 6n,
  actual_micro_usd: '700',
  estimated_micro_usd: '301',
  priced_requests: 2,
  fallback_requests: 1,
  accuracy_actual_micro_usd: '900',
  accuracy_estimated_micro_usd: '1000',
};

function group(over: Partial<ObservabilityGroupRow>): ObservabilityGroupRow {
  return { ...emptyGroupRow('k', null, null), ...sums, ...over };
}

describe('observability mapper', () => {
  it('rounds integer division half up', () => {
    expect(divideHalfUp(5n, 2n)).toBe(3n);
    expect(divideHalfUp(4n, 3n)).toBe(1n);
    expect(divideHalfUp(0n, 7n)).toBe(0n);
  });

  it('derives money in BigInt and ratios as numbers', () => {
    const derived = toObsDerived(sums, { costMicroUsd: 2002n, requests: 6 });
    expect(derived.costPerRequestMicroUsd).toBe('334');
    expect(derived.costPer1kTokensMicroUsd).toBe('334');
    expect(derived.avgInputTokens).toBe(666.67);
    expect(derived.avgOutputTokens).toBe(333.33);
    expect(derived.toolCallsPerRequest).toBe(2);
    expect(derived.cacheHitRate).toBe(0.1667);
    expect(derived.reasoningShare).toBe(0.25);
    expect(derived.shareOfCostPct).toBe(50);
    expect(derived.shareOfRequestsPct).toBe(50);
    expect(derived.estimateAccuracy).toBe(0.9);
  });

  it('returns null, never NaN, when a denominator is zero', () => {
    const derived = toObsDerived(EMPTY_OBS_SUMS_ROW, { costMicroUsd: 0n, requests: 0 });
    expect(Object.values(derived).every((value) => value === null)).toBe(true);
  });

  it('builds stats for an undefined row as zeros', () => {
    const stats = toObsStats(undefined, shareBaseOf(undefined));
    expect(stats.metrics.requests).toBe(0);
    expect(stats.metrics.cost.costMicroUsd).toBe('0');
    expect(stats.derived.costPerRequestMicroUsd).toBeNull();
    expect(totalCostMicroUsd(undefined)).toBe(0n);
    expect(totalCostMicroUsd(sums)).toBe(1001n);
  });

  it('computes settle and refund rate and rounds the settle times', () => {
    const health = toObsHealth({
      group_key: 'A',
      finalized: 9,
      released: 1,
      in_flight: 2,
      stale_reserved: 1,
      avg_ms: 100.4,
      p50_ms: 90.5,
      p95_ms: null,
    });
    expect(health).toMatchObject({
      settleRate: 0.9,
      refundRate: 0.1,
      avgSettleMs: 100,
      p50SettleMs: 91,
      p95SettleMs: null,
      inFlight: 2,
      staleReserved: 1,
    });
    expect(toObsHealth(undefined).settleRate).toBeNull();
  });

  it('shows the full email only in FULL mode and never leaks it into the label when masked', () => {
    const row = group({
      group_key: 'u1',
      email: 'jane.doe@example.com',
      username: 'jane',
      role: 'USER',
      status: 'ACTIVE',
      user_created_at: new Date('2026-09-01T00:00:00Z'),
      plan_id: 'p1',
      plan_name: 'Pro',
      distinct_users: 1,
      distinct_models: 4,
    });
    const base = shareBaseOf(row);
    const full = toEntityRow(
      row,
      ObservabilityEntity.USER,
      base,
      ObservabilityEmailMode.FULL,
      null,
    );
    expect(full.email).toBe('jane.doe@example.com');
    expect(full.maskedEmail).toBe('ja***@example.com');
    expect(full.signedUpAt).toBe('2026-09-01T00:00:00.000Z');
    expect(full.planName).toBe('Pro');
    expect(full.metrics.distinctModels).toBe(4);
    const masked = toEntityRow(
      row,
      ObservabilityEntity.USER,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(masked.email).toBeNull();
    expect(masked.label).toBe('ja***@example.com');
    expect(JSON.stringify(masked)).not.toContain('jane.doe');
  });

  it('labels a user with no email by username, then by id', () => {
    const base = shareBaseOf(sums);
    const named = toEntityRow(
      group({ group_key: 'u2', username: 'bob' }),
      ObservabilityEntity.USER,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(named.label).toBe('bob');
    const bare = toEntityRow(
      group({ group_key: 'u3' }),
      ObservabilityEntity.USER,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(bare.label).toBe('u3');
  });

  it('normalises providers and labels models, plans and workflows', () => {
    const base = shareBaseOf(sums);
    const provider = toEntityRow(
      group({ group_key: 'LOCAL_OLLAMA', raw_provider: 'local-ollama' }),
      ObservabilityEntity.PROVIDER,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(provider).toMatchObject({
      kind: 'PROVIDER',
      provider: 'LOCAL_OLLAMA',
      label: 'Local Ollama',
      userId: null,
    });
    const model = toEntityRow(
      group({ group_key: 'GEMINI/g-1', raw_provider: 'gemini', model: 'g-1' }),
      ObservabilityEntity.MODEL,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(model).toMatchObject({ kind: 'MODEL', label: 'g-1', model: 'g-1', provider: 'GEMINI' });
    const plan = toEntityRow(
      group({ group_key: 'NONE' }),
      ObservabilityEntity.PLAN,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(plan.label).toBe('NONE');
    const named = toEntityRow(
      group({ group_key: 'p1', plan_id: 'p1', plan_name: 'Pro' }),
      ObservabilityEntity.PLAN,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(named.label).toBe('Pro');
    const workflow = toEntityRow(
      group({ group_key: '' }),
      ObservabilityEntity.WORKFLOW,
      base,
      ObservabilityEmailMode.MASKED,
      null,
    );
    expect(workflow.label).toBe('UNKNOWN');
    const chat = toEntityRow(
      group({ group_key: 'CHAT' }),
      ObservabilityEntity.WORKFLOW,
      base,
      ObservabilityEmailMode.MASKED,
      {
        group_key: 'CHAT',
        finalized: 1,
        released: 0,
        in_flight: 0,
        stale_reserved: 0,
        avg_ms: 5,
        p50_ms: 5,
        p95_ms: 5,
      },
    );
    expect(chat.label).toBe('CHAT');
    expect(chat.health?.settleRate).toBe(1);
  });

  it('turns a series row into a point with a BigInt-safe cost', () => {
    const point = toObsSeriesPoint({
      ...sums,
      bucket_start: new Date('2026-10-01T05:00:00Z'),
      active_users: 2,
    });
    expect(point).toMatchObject({
      bucketStart: '2026-10-01T05:00:00.000Z',
      requests: 3,
      costMicroUsd: '1001',
      activeUsers: 2,
      toolCalls: 6,
    });
    expect(toSignupPoint({ bucket_start: new Date('2026-10-01T00:00:00Z'), total: 4 })).toEqual({
      bucketStart: '2026-10-01T00:00:00.000Z',
      count: 4,
    });
  });

  it('fills every hour and weekday so charts have no gaps', () => {
    const hours = toHourOfDay([{ bucket: 3, requests: 5, cost_micro_usd: '9' }]);
    expect(hours).toHaveLength(24);
    expect(hours[3]).toEqual({ bucket: 3, requests: 5, costMicroUsd: '9' });
    expect(hours[4]).toEqual({ bucket: 4, requests: 0, costMicroUsd: '0' });
    const days = toDayOfWeek([{ bucket: 7, requests: 1, cost_micro_usd: '2' }]);
    expect(days.map((day) => day.bucket)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[6]?.requests).toBe(1);
  });

  it('maps the billing split and falls back to PLAN for an unknown kind', () => {
    expect(
      toBillingSplit([
        { billing: 'CREDIT', requests: 2, cost_micro_usd: '5' },
        { billing: 'weird', requests: 1, cost_micro_usd: '1' },
      ]),
    ).toEqual([
      { billing: 'CREDIT', requests: 2, costMicroUsd: '5' },
      { billing: 'PLAN', requests: 1, costMicroUsd: '1' },
    ]);
  });

  it('computes KPI change in percent, null off a zero base, negative on a drop', () => {
    expect(toKpiDelta(150n, 100n)).toEqual({ current: '150', previous: '100', changePct: 50 });
    expect(toKpiDelta(50n, 100n).changePct).toBe(-50);
    expect(toKpiDelta(10n, 0n).changePct).toBeNull();
    expect(toKpiDelta(1n, 3n).changePct).toBe(-66.66);
  });

  it('builds an empty group row for an entity with no usage', () => {
    const empty = emptyGroupRow('GEMINI', 'GEMINI', null);
    expect(empty.requests).toBe(0);
    expect(empty.raw_provider).toBe('GEMINI');
  });

  it('maps first and last seen to ISO strings, or null when the group has no rows', () => {
    const seen = toObsMetrics({
      ...sums,
      first_seen_at: new Date('2026-10-01T00:00:00Z'),
      last_seen_at: new Date('2026-10-02T12:30:00Z'),
    });
    expect(seen.firstSeenAt).toBe('2026-10-01T00:00:00.000Z');
    expect(seen.lastSeenAt).toBe('2026-10-02T12:30:00.000Z');
    const never = toObsMetrics(EMPTY_OBS_SUMS_ROW);
    expect(never.firstSeenAt).toBeNull();
    expect(never.lastSeenAt).toBeNull();
  });

  it('builds the empty detail header for a provider and for a model', () => {
    expect(emptyDetailRow(ObservabilityEntity.PROVIDER, 'GEMINI', null)).toMatchObject({
      group_key: 'GEMINI',
      raw_provider: 'GEMINI',
      model: null,
    });
    expect(emptyDetailRow(ObservabilityEntity.MODEL, 'GEMINI', 'g1')).toMatchObject({
      group_key: 'GEMINI/g1',
      raw_provider: 'GEMINI',
      model: 'g1',
    });
    expect(emptyDetailRow(ObservabilityEntity.PROVIDER, null, null).group_key).toBe('');
    expect(emptyDetailRow(ObservabilityEntity.MODEL, null, null)).toMatchObject({
      group_key: '/',
      raw_provider: null,
      model: null,
    });
  });

  describe('zero-filled series', () => {
    const hourly = {
      from: new Date('2026-10-01T10:30:00Z'),
      to: new Date('2026-10-01T14:00:00Z'),
      grain: 'HOUR' as const,
    };

    it('has a point for every hour from the first bucket to the end, zeros where quiet', () => {
      const points = toFilledSeries(
        [{ ...sums, bucket_start: new Date('2026-10-01T12:00:00Z'), active_users: 2 }],
        hourly,
      );
      expect(points.map((point) => point.bucketStart)).toEqual([
        '2026-10-01T10:00:00.000Z',
        '2026-10-01T11:00:00.000Z',
        '2026-10-01T12:00:00.000Z',
        '2026-10-01T13:00:00.000Z',
      ]);
      expect(points[2]).toMatchObject({ requests: 3, activeUsers: 2, costMicroUsd: '1001' });
      expect(points[0]).toEqual({
        bucketStart: '2026-10-01T10:00:00.000Z',
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        weightedTokens: 0,
        toolCalls: 0,
        costMicroUsd: '0',
        activeUsers: 0,
      });
    });

    it('fills daily buckets and an empty window with explicit zero points', () => {
      const daily = {
        from: new Date('2026-09-28T00:00:00Z'),
        to: new Date('2026-10-01T06:00:00Z'),
        grain: 'DAY' as const,
      };
      const points = toFilledSeries([], daily);
      expect(points.map((point) => point.bucketStart)).toEqual([
        '2026-09-28T00:00:00.000Z',
        '2026-09-29T00:00:00.000Z',
        '2026-09-30T00:00:00.000Z',
        '2026-10-01T00:00:00.000Z',
      ]);
      expect(points.every((point) => point.requests === 0 && point.costMicroUsd === '0')).toBe(
        true,
      );
    });

    it('fills the signups series the same way', () => {
      const points = toFilledSignups(
        [{ bucket_start: new Date('2026-10-01T11:00:00Z'), total: 4 }],
        hourly,
      );
      expect(points).toEqual([
        { bucketStart: '2026-10-01T10:00:00.000Z', count: 0 },
        { bucketStart: '2026-10-01T11:00:00.000Z', count: 4 },
        { bucketStart: '2026-10-01T12:00:00.000Z', count: 0 },
        { bucketStart: '2026-10-01T13:00:00.000Z', count: 0 },
      ]);
    });
  });
});
