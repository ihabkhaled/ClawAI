import { type Mock, vi } from 'vitest';
import { AdminUsageAuditConsumer } from '@modules/audits/consumers/admin-usage-audit.consumer';
import {
  failuresQuerySchema,
  tracingQuerySchema,
} from '@modules/audits/dtos/observability-query.dto';
import { ObservabilityRepository } from '@modules/audits/repositories/observability.repository';
import { AuditLogSchema } from '@modules/audits/schemas/audit-log.schema';
import { ObservabilityService } from '@modules/audits/services/observability.service';
import {
  normalizeProviderKey,
  providerLabel,
} from '@modules/audits/utilities/provider-label.utility';
import type { FailuresQuery, TracingQuery } from '@modules/audits/types/observability.types';

const failuresQuery: FailuresQuery = {
  hours: 24,
  includeSync: false,
  search: null,
  sort: 'count',
  order: 'desc',
  page: 1,
  limit: 20,
};

const tracingQuery: TracingQuery = {
  hours: 24,
  dimension: 'provider',
  search: null,
  sort: 'requests',
  order: 'desc',
  page: 1,
  limit: 20,
};

function aggregateMock(result: unknown[]) {
  const option = vi.fn().mockResolvedValue(result);
  const aggregate = vi.fn().mockReturnValue({ option });
  return { aggregate, option };
}

describe('provider labels', () => {
  it('folds local-ollama and CLAW to one label each', () => {
    expect(normalizeProviderKey('local-ollama')).toBe('LOCAL_OLLAMA');
    expect(providerLabel('local-ollama')).toBe('Local Ollama');
    expect(providerLabel('CLAW')).toBe('ClawAI (platform)');
    expect(providerLabel(undefined)).toBe('Unknown');
  });
});

describe('observability query schemas', () => {
  it('defaults to a 24 hour window and caps it at 30 days', () => {
    expect(failuresQuerySchema.parse({}).hours).toBe(24);
    expect(failuresQuerySchema.parse({}).includeSync).toBe(false);
    expect(failuresQuerySchema.safeParse({ hours: 721 }).success).toBe(false);
    expect(failuresQuerySchema.parse({ includeSync: 'true' }).includeSync).toBe(true);
    expect(tracingQuerySchema.safeParse({ dimension: 'user' }).success).toBe(false);
  });
});

describe('AuditLog indexes', () => {
  it('has the indexes the failures window query needs', () => {
    const keys = AuditLogSchema.indexes().map(([fields]) => JSON.stringify(fields));
    expect(keys).toContain(JSON.stringify({ createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ severity: 1, createdAt: -1 }));
  });
});

describe('ObservabilityRepository', () => {
  function build(result: unknown[]) {
    const audit = aggregateMock(result);
    const usage = aggregateMock(result);
    const repo = new ObservabilityRepository(audit as never, usage as never);
    return { repo, audit, usage };
  }
  const window = {
    from: new Date('2026-10-04T12:00:00Z'),
    to: new Date('2026-10-05T12:00:00Z'),
    hours: 24,
  };

  it('bounds the failures pipeline by window and severity first, with a time limit', async () => {
    const { repo, audit } = build([{}]);
    await repo.failures(window, failuresQuery);
    const pipeline = (audit.aggregate as Mock).mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        createdAt: { $gte: window.from, $lt: window.to },
        severity: { $in: ['HIGH', 'CRITICAL'] },
      },
    });
    expect(audit.option).toHaveBeenCalledWith(expect.objectContaining({ maxTimeMS: 20_000 }));
  });

  it('excludes SYNC_ noise from the groups unless asked', async () => {
    const { repo, audit } = build([{}]);
    await repo.failures(window, failuresQuery);
    const first = (audit.aggregate as Mock).mock.calls[0]?.[0] as Array<{
      $facet?: { groups: unknown[] };
    }>;
    expect(JSON.stringify(first[1]?.$facet?.groups[0])).toContain('^SYNC_');

    const included = build([{}]);
    await included.repo.failures(window, { ...failuresQuery, includeSync: true });
    const second = (included.audit.aggregate as Mock).mock.calls[0]?.[0] as Array<{
      $facet?: { groups: unknown[] };
    }>;
    expect(second[1]?.$facet?.groups[0]).toEqual({ $match: {} });
  });

  it('escapes regex characters in search text', async () => {
    const { repo, usage } = build([{}]);
    await repo.tracing(window, { ...tracingQuery, search: 'gpt(4)' });
    const pipeline = (usage.aggregate as Mock).mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(JSON.stringify(pipeline[0])).toContain('gpt\\\\(4\\\\)');
  });
});

describe('ObservabilityService', () => {
  function build() {
    const repository = {
      failures: vi.fn(),
      tracing: vi.fn(),
      tracingOverall: vi.fn(),
      signals: vi.fn().mockResolvedValue([{ _id: 'ROUTING_FALLBACK', count: 4 }]),
      failureCounts: vi.fn().mockResolvedValue([{ _id: 'OPENAI', count: 1 }]),
    };
    return { repository, service: new ObservabilityService(repository as never) };
  }

  it('reports sync noise on its own and labels groups and providers', async () => {
    const { repository, service } = build();
    repository.failures.mockResolvedValue({
      groups: [
        {
          _id: { action: 'ROUTING_NO_EXECUTION_MODEL', entityType: 'router', severity: 'HIGH' },
          count: 7,
          lastSeenAt: new Date('2026-10-05T11:00:00Z'),
        },
      ],
      groupsTotal: [{ total: 41 }],
      totals: [
        { _id: true, count: 130000 },
        { _id: false, count: 9 },
      ],
      bySource: [{ _id: 'router', count: 7 }],
      providers: [
        { _id: 'LOCAL_OLLAMA', count: 3 },
        { _id: 'LOCAL-OLLAMA', count: 2 },
      ],
      models: [{ _id: 'gpt-x', count: 1 }],
    });

    const result = await service.getFailures(failuresQuery);

    expect(result.totals).toEqual({ failures: 9, syncNoise: 130000 });
    expect(result.groups.total).toBe(41);
    expect(result.groups.totalPages).toBe(3);
    expect(result.groups.items[0]).toMatchObject({ isSyncNoise: false, source: 'router' });
    expect(result.topProviders).toEqual([{ key: 'LOCAL_OLLAMA', label: 'Local Ollama', count: 5 }]);
  });

  it('returns an empty, well-formed response for an empty store', async () => {
    const { repository, service } = build();
    repository.failures.mockResolvedValue(undefined);
    const result = await service.getFailures(failuresQuery);
    expect(result.totals).toEqual({ failures: 0, syncNoise: 0 });
    expect(result.groups.items).toEqual([]);
  });

  it('computes tracing rows with percentiles, estimate split and an error rate', async () => {
    const { repository, service } = build();
    repository.tracing.mockResolvedValue({
      rows: [
        {
          _id: 'OPENAI',
          provider: 'openai',
          model: 'gpt-x',
          requests: 9,
          measured: 8,
          avgLatency: 410.4,
          percentiles: [300.2, 900.7],
          p95: 900.7,
          totalTokens: 1234,
          estimatedRequests: 2,
        },
      ],
      total: [{ total: 1 }],
    });
    repository.tracingOverall.mockResolvedValue({
      requests: 9,
      measured: 8,
      percentiles: [310, 950],
    });

    const result = await service.getTracing(tracingQuery);

    expect(result.rows.items[0]).toMatchObject({
      label: 'OpenAI',
      p50LatencyMs: 300,
      p95LatencyMs: 901,
      providerReportedRequests: 7,
      estimatedRequests: 2,
      failureEvents: 1,
      errorRate: 0.1,
    });
    expect(result.overall.p95LatencyMs).toBe(950);
    expect(result.signals).toEqual([{ action: 'ROUTING_FALLBACK', count: 4 }]);
  });

  it('does not attribute failures to the context view', async () => {
    const { repository, service } = build();
    repository.tracing.mockResolvedValue({
      rows: [
        {
          _id: 'chat',
          provider: null,
          model: null,
          requests: 1,
          measured: 0,
          avgLatency: null,
          percentiles: [null, null],
          p95: null,
          totalTokens: 5,
          estimatedRequests: 0,
        },
      ],
      total: [{ total: 1 }],
    });
    repository.tracingOverall.mockResolvedValue(undefined);
    const result = await service.getTracing({ ...tracingQuery, dimension: 'context' });
    expect(repository.failureCounts).not.toHaveBeenCalled();
    expect(result.rows.items[0]).toMatchObject({
      failureEvents: null,
      errorRate: null,
      p95LatencyMs: null,
    });
  });
});

describe('AdminUsageAuditConsumer', () => {
  function build() {
    const audits = { createAuditLog: vi.fn().mockResolvedValue({}) };
    const rabbitmq = { subscribe: vi.fn().mockResolvedValue(undefined) };
    return {
      audits,
      rabbitmq,
      consumer: new AdminUsageAuditConsumer(rabbitmq as never, audits as never),
    };
  }

  it('subscribes to the viewed, exported and listed admin read events', async () => {
    const { rabbitmq, consumer } = build();
    await consumer.onModuleInit();
    expect(rabbitmq.subscribe.mock.calls.map((call) => call[0])).toEqual([
      'admin.usage.viewed',
      'admin.usage.exported',
      'admin.usage.listed',
    ]);
  });

  it('writes actor, target and filters, and copies nothing else', async () => {
    const { audits, consumer } = build();
    await consumer.handle('ADMIN_USER_USAGE_VIEWED', {
      actorUserId: 'admin-1',
      targetUserId: 'u1',
      at: '2026-10-05T12:00:00Z',
      filters: { provider: 'CLAW' },
      email: 'leak@example.com',
    });
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'ADMIN_USER_USAGE_VIEWED',
      entityType: 'user',
      entityId: 'u1',
      severity: 'MEDIUM',
      details: { filters: { provider: 'CLAW' }, at: '2026-10-05T12:00:00Z' },
    });
    expect(JSON.stringify(audits.createAuditLog.mock.calls)).not.toContain('leak@example.com');
  });

  it('ignores a malformed payload and survives a failed write', async () => {
    const { audits, consumer } = build();
    await consumer.handle('X', null);
    await consumer.handle('X', { targetUserId: 'u1' });
    expect(audits.createAuditLog).not.toHaveBeenCalled();
    audits.createAuditLog.mockRejectedValue(new Error('mongo down'));
    await expect(
      consumer.handle('X', { actorUserId: 'a', targetUserId: null, at: 'now', filters: {} }),
    ).resolves.toBeUndefined();
  });
});
