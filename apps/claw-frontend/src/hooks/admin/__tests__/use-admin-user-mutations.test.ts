import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { PlanLifecycleStatus } from '@/enums';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { showToast } from '@/utilities';

import { useAdminUserMutations } from '../use-admin-user-mutations';

vi.mock('@/repositories/audit/audit.repository');
vi.mock('@/repositories/admin/plans.repository');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), apiError: vi.fn() },
  logger: { info: vi.fn() },
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useAdminUserMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles change-role success with pending ID then cleared/invalidation/success toast', async () => {
    vi.mocked(auditRepository.updateUserRole).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper: createWrapper() });
    const userId = 'user-123';
    const role = 'admin';

    act(() => {
      result.current.handleChangeRole(userId, role);
    });

    expect(result.current.actionPending).toBe(userId);
    expect(result.current.isRoleChangePending).toBe(true);

    await waitFor(() => {
      expect(result.current.actionPending).toBeNull();
    });

    expect(auditRepository.updateUserRole).toHaveBeenCalledWith(userId, role);
    expect(showToast.success).toHaveBeenCalled();
  });

  it('handles assign-plan success proving shared pending ID', async () => {
    vi.mocked(plansRepository.assignUser).mockResolvedValue({
      id: 'plan-789',
      name: 'Pro',
      slug: 'pro',
      description: null,
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'USD',
      displayOrder: 1,
      isDefault: false,
      isPopular: false,
      isActive: true,
      isPublic: true,
      isTrial: false,
      trialDurationDays: 0,
      lifecycleStatus: PlanLifecycleStatus.ACTIVE,
      replacementPlanId: null,
      retiredAt: null,
      dailyTokenQuota: 1,
      weeklyTokenQuota: 1,
      monthlyTokenQuota: 1,
      monthlyProviderCostCeilingMicroUsd: null,
      maxChatsPerDay: 1,
      maxMessagesPerDay: 1,
      maxWorkspaceConnections: 1,
      maxContextPacks: 1,
      maxMemoryItems: 1,
      allowCompareMode: false,
      allowJudgeMode: false,
      allowResearchMode: false,
      allowCriticReview: false,
      allowWorkspaces: false,
      allowMemory: false,
      allowContextPacks: false,
      allowConsensusMode: false,
      allowEscalationChain: false,
      allowRepairLab: false,
      allowTaskDecomposer: false,
      allowBestOfN: false,
      allowVerifier: false,
      allowPipelineLab: false,
      allowCostEnsemble: false,
      allowRolePack: false,
      modelAccess: [],
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper: createWrapper() });
    const userId = 'user-456';
    const planId = 'plan-789';

    act(() => {
      result.current.handleAssignPlan(userId, planId);
    });

    expect(result.current.actionPending).toBe(userId);
    expect(result.current.isAssignPlanPending).toBe(true);

    await waitFor(() => {
      expect(result.current.actionPending).toBeNull();
    });

    expect(plansRepository.assignUser).toHaveBeenCalledWith(userId, planId);
    expect(showToast.success).toHaveBeenCalled();
  });

  it('handles rejected operation proving apiError and cleared pending', async () => {
    const error = new Error('Failed');
    vi.mocked(auditRepository.deactivateUser).mockRejectedValue(error);
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper: createWrapper() });
    const userId = 'user-999';

    act(() => {
      result.current.handleDeactivate(userId);
    });

    expect(result.current.actionPending).toBe(userId);

    await waitFor(() => {
      expect(result.current.actionPending).toBeNull();
    });

    // The third argument carries `t`, so a coded refusal renders translated
    // instead of quoting the backend's English.
    expect(showToast.apiError).toHaveBeenCalledWith(
      error,
      expect.any(String),
      expect.objectContaining({ translate: expect.any(Function) }),
    );
  });
});
