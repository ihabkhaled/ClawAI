import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminUserStatisticsRepository } from '@/repositories/admin/user-statistics.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

const mockGet = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// Rule 28.6: assert the REAL URL, not merely that the client was called. A
// repository pointed at the wrong path still satisfies `toHaveBeenCalled()`,
// and these three paths span two services — `/admin/users/...` is auth-service
// and `/admin/billing/users/...` is payment-service, so a copy-paste between
// them would 404 in production while every test stayed green.
describe('admin user statistics repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads usage statistics from the auth-service admin users route', async () => {
    mockGet.mockResolvedValueOnce({ data: { userId: 'u-1' } });

    await expect(adminUserStatisticsRepository.getUsageStatistics('u-1')).resolves.toEqual({
      userId: 'u-1',
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/users/u-1/usage-statistics');
  });

  it('reads the plan overview from the auth-service admin users route', async () => {
    mockGet.mockResolvedValueOnce({ data: { userId: 'u-2' } });

    await expect(adminUserStatisticsRepository.getPlanOverview('u-2')).resolves.toEqual({
      userId: 'u-2',
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/users/u-2/plan-overview');
  });

  it('reads subscription statistics from the payment-service admin billing route', async () => {
    mockGet.mockResolvedValueOnce({ data: { userId: 'u-3' } });

    await expect(adminUserStatisticsRepository.getSubscriptionStatistics('u-3')).resolves.toEqual({
      userId: 'u-3',
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/billing/users/u-3/subscription');
  });

  it('never reuses one user id for another user in the same session', async () => {
    mockGet.mockResolvedValue({ data: {} });

    await adminUserStatisticsRepository.getUsageStatistics('alice');
    await adminUserStatisticsRepository.getUsageStatistics('bob');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/admin/users/alice/usage-statistics');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/admin/users/bob/usage-statistics');
  });
});

describe('admin user statistics query keys', () => {
  it('keys each panel by user id so two rows cannot share a cache entry', () => {
    expect(queryKeys.admin.userUsageStatistics('u-1')).toEqual([
      'admin',
      'users',
      'usage-statistics',
      'u-1',
    ]);
    expect(queryKeys.admin.userPlanOverview('u-1')).toEqual([
      'admin',
      'users',
      'plan-overview',
      'u-1',
    ]);
    expect(queryKeys.admin.userSubscriptionStatistics('u-1')).toEqual([
      'admin',
      'users',
      'subscription-statistics',
      'u-1',
    ]);
    expect(queryKeys.admin.userUsageStatistics('u-1')).not.toEqual(
      queryKeys.admin.userUsageStatistics('u-2'),
    );
  });
});
