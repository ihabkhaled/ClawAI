import { beforeEach, describe, expect, it, vi } from 'vitest';

import { liveAdminRepository } from '@/repositories/live/live-admin.repository';
import { apiClient } from '@/services/shared/api-client';
import type { LivePolicyConfig } from '@/types/live-admin.types';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const CONFIG: LivePolicyConfig = {
  featureEnabled: true,
  killSwitch: false,
  plans: { free: { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 } },
  defaultPlan: { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 },
  visionBilling: 'ACTUAL_COST',
  graceSeconds: 60,
  maxActiveStreams: 10,
  maxSessionsPerUser: 2,
  sessionsPerUserPerHour: 10,
  dailyBudgetMicroUsd: 20_000_000,
  budgetSoftStopPercent: 80,
  summaryModelChain: [],
  visionModelChain: [],
};

describe('liveAdminRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'g', status: 200 });
    vi.mocked(apiClient.post).mockResolvedValue({ data: 'p', status: 200 });
    vi.mocked(apiClient.put).mockResolvedValue({ data: 'u', status: 200 });
  });

  it('reads the overview for a number of days', async () => {
    await liveAdminRepository.getOverview(7);
    expect(apiClient.get).toHaveBeenCalledWith('/live/admin/overview', { days: '7' });
  });

  it('stops a run', async () => {
    await liveAdminRepository.stopRun('r1');
    expect(apiClient.post).toHaveBeenCalledWith('/live/admin/runs/r1/stop', {});
  });

  it('omits a blank note (the server requires 1..500 characters when present)', async () => {
    await liveAdminRepository.savePolicy({ config: CONFIG, note: '   ' });
    expect(apiClient.put).toHaveBeenCalledWith('/live/admin/policy', { config: CONFIG });
  });

  it('saves the policy as {config, note} and rolls back by version', async () => {
    await liveAdminRepository.savePolicy({ config: CONFIG, note: 'raise free minutes' });
    expect(apiClient.put).toHaveBeenCalledWith('/live/admin/policy', {
      config: CONFIG,
      note: 'raise free minutes',
    });
    await liveAdminRepository.rollbackPolicy(3);
    expect(apiClient.post).toHaveBeenCalledWith('/live/admin/policy/rollback', { version: 3 });
  });
});
