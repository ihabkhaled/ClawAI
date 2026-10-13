import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TracingDimension } from '@/enums/tracing-dimension.enum';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';

const mockGet = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// Rule 28.6: assert the real URL and the real query string, not just that the client ran.
describe('observability explorer repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { ok: true } });
  });

  it('lists users with the range, filters, page and list controls as strings', async () => {
    await observabilityExplorerRepository.getList(
      'users',
      { days: '7', provider: 'GEMINI', plan: 'NONE' },
      { search: 'jane', sort: 'cost', order: 'desc', limit: 25, page: 3 },
    );
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/users', {
      days: '7',
      provider: 'GEMINI',
      plan: 'NONE',
      search: 'jane',
      sort: 'cost',
      order: 'desc',
      limit: '25',
      page: '3',
    });
  });

  it('drops empty values so the server defaults apply', async () => {
    await observabilityExplorerRepository.getList('providers', {}, { search: '' });
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/providers', {});
  });

  it('reads every list kind from its own endpoint', async () => {
    for (const kind of ['models', 'plans', 'workflows'] as const) {
      await observabilityExplorerRepository.getList(kind, { days: '30' }, {});
      expect(mockGet).toHaveBeenLastCalledWith(`/admin/observability/${kind}`, { days: '30' });
    }
  });

  it('exports with the same period, filters and search as the table, without paging', async () => {
    await observabilityExplorerRepository.exportUsers(
      { days: '30', plan: 'p-1' },
      { search: 'jane', sort: 'requests', order: 'asc' },
    );
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/users/export', {
      days: '30',
      plan: 'p-1',
      search: 'jane',
      sort: 'requests',
      order: 'asc',
    });
  });

  it('reads the filter options for the range alone and the overview with the filters', async () => {
    await observabilityExplorerRepository.getFilterOptions({ days: '7' });
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/filter-options', { days: '7' });
    await observabilityExplorerRepository.getOverview({ days: '7', billing: 'CREDIT' });
    expect(mockGet).toHaveBeenLastCalledWith('/admin/observability/overview', {
      days: '7',
      billing: 'CREDIT',
    });
  });

  it('reads the hold health for the period and filters', async () => {
    await observabilityExplorerRepository.getHealth({ days: '30', provider: 'GEMINI' });
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/health', {
      days: '30',
      provider: 'GEMINI',
    });
  });

  it('puts a provider in the path and a model id in the query string', async () => {
    await observabilityExplorerRepository.getProviderDetail('LOCAL_OLLAMA', { days: '7' });
    expect(mockGet).toHaveBeenCalledWith('/admin/observability/providers/LOCAL_OLLAMA', {
      days: '7',
    });
    await observabilityExplorerRepository.getModelDetail('OPENAI', 'ft:gpt-4o/mini', {
      days: '7',
      provider: 'GEMINI',
    });
    expect(mockGet).toHaveBeenLastCalledWith('/admin/observability/models/detail', {
      days: '7',
      provider: 'OPENAI',
      model: 'ft:gpt-4o/mini',
    });
  });

  it('sends the dimension and cursor to the leaderboard', async () => {
    await observabilityExplorerRepository.getLeaderboard(
      { days: '7' },
      { dimension: UsageLeaderboardDimension.User, cursor: 'abc' },
    );
    expect(mockGet).toHaveBeenCalledWith('/admin/usage-explorer/leaderboard', {
      days: '7',
      dimension: 'user',
      cursor: 'abc',
    });
  });

  it('reads the timeseries, optionally for one user', async () => {
    await observabilityExplorerRepository.getTimeseries({ days: '7' }, '');
    expect(mockGet).toHaveBeenCalledWith('/admin/usage-explorer/timeseries', { days: '7' });
    await observabilityExplorerRepository.getTimeseries({ days: '7' }, 'u-1');
    expect(mockGet).toHaveBeenLastCalledWith('/admin/usage-explorer/timeseries', {
      days: '7',
      userId: 'u-1',
    });
  });

  it('encodes the user id in the detail and requests paths', async () => {
    await observabilityExplorerRepository.getUserDetail('a/b?c', { days: '7' });
    expect(mockGet).toHaveBeenCalledWith('/admin/usage-explorer/users/a%2Fb%3Fc', { days: '7' });
    await observabilityExplorerRepository.getUserRequests('u-1', {}, { sort: 'time' });
    expect(mockGet).toHaveBeenLastCalledWith('/admin/usage-explorer/users/u-1/requests', {
      sort: 'time',
    });
  });

  it('reads audit failures including the explicit false for includeSync', async () => {
    await observabilityExplorerRepository.getFailures({
      hours: 24,
      includeSync: false,
      search: '',
      sort: 'count',
      order: 'desc',
      page: 1,
      limit: 10,
    });
    expect(mockGet).toHaveBeenCalledWith('/audits/failures', {
      hours: '24',
      includeSync: 'false',
      sort: 'count',
      order: 'desc',
      page: '1',
      limit: '10',
    });
  });

  it('reads tracing by dimension', async () => {
    await observabilityExplorerRepository.getTracing({
      hours: 48,
      dimension: TracingDimension.Model,
      search: 'gem',
      sort: 'p95',
      order: 'asc',
      page: 2,
      limit: 10,
    });
    expect(mockGet).toHaveBeenCalledWith('/usage/tracing', {
      hours: '48',
      dimension: 'model',
      search: 'gem',
      sort: 'p95',
      order: 'asc',
      page: '2',
      limit: '10',
    });
  });
});
