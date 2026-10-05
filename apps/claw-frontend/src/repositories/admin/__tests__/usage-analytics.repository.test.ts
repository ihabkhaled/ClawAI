import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminUsageAnalyticsRepository } from '@/repositories/admin/usage-analytics.repository';

const mockGet = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// Rule 28.6: assert the real URL and the real query-string, not just that the client ran.
describe('admin usage analytics repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the per-user breakdown from the auth-service admin users route', async () => {
    mockGet.mockResolvedValueOnce({ data: { userId: 'u-1' } });

    await expect(
      adminUsageAnalyticsRepository.getUserBreakdown('u-1', { hours: 168 }),
    ).resolves.toEqual({ userId: 'u-1' });
    expect(mockGet).toHaveBeenCalledWith('/admin/users/u-1/usage-breakdown', { hours: '168' });
  });

  it('encodes the user id so it cannot change the path', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    await adminUsageAnalyticsRepository.getUserBreakdown('a/b?c', {});

    expect(mockGet).toHaveBeenCalledWith('/admin/users/a%2Fb%3Fc/usage-breakdown', {});
  });

  it('sends the overview query as strings and drops empty values', async () => {
    mockGet.mockResolvedValueOnce({ data: { grain: 'DAY' } });

    await adminUsageAnalyticsRepository.getOverview({
      from: '2026-10-01T00:00:00.000Z',
      userId: '',
      limit: 10,
    });

    expect(mockGet).toHaveBeenCalledWith('/admin/usage-analytics', {
      from: '2026-10-01T00:00:00.000Z',
      limit: '10',
    });
  });
});
