import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanLifecycleStatus } from '@/enums';
import { usePlanFormPage } from '@/hooks/plans/use-plan-form-page';
import type { PlanView } from '@/types';

const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockPush = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();
let mockParams: { id?: string } = {};

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', role: 'ADMIN' }, isLoading: false, isError: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    showToast: {
      success: (...args: unknown[]) => mockShowToastSuccess(...args),
      apiError: (...args: unknown[]) => mockShowToastApiError(...args),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const samplePlan = {
  id: 'pl1',
  name: 'Pro',
  slug: 'pro',
  description: null,
  priceMonthly: null,
  priceYearly: null,
  currency: 'USD',
  displayOrder: 0,
  isDefault: false,
  isPopular: false,
  isActive: true,
  isPublic: true,
  isTrial: false,
  trialDurationDays: null,
  lifecycleStatus: PlanLifecycleStatus.ACTIVE,
  replacementPlanId: null,
  retiredAt: null,
  dailyTokenQuota: 100000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: null,
  monthlyProviderCostCeilingMicroUsd: null,
  paygCreditPercentBps: 3000,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: null,
  maxContextPacks: null,
  maxMemoryItems: null,
  allowCompareMode: true,
  allowJudgeMode: true,
  allowResearchMode: false,
  allowCriticReview: false,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: true,
  allowConsensusMode: true,
  allowEscalationChain: false,
  allowRepairLab: false,
  allowTaskDecomposer: true,
  allowBestOfN: true,
  allowVerifier: false,
  allowPipelineLab: false,
  allowCostEnsemble: false,
  allowRolePack: false,
  modelAccess: [],
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
} satisfies PlanView;

describe('usePlanFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  it('reports create mode when no id param is present', () => {
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });
    expect(result.current.isEdit).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan).toBeNull();
  });

  it('create-mode submit posts a valid payload and navigates back on success', async () => {
    mockCreate.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });

    act(() => {
      result.current.form.setField('name', 'Pro');
      result.current.form.setField('slug', 'pro');
    });
    act(() => {
      result.current.onSubmit();
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    expect(mockShowToastSuccess).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin/plans');
  });

  it('create-mode submit surfaces submitError + apiError toast on failure', async () => {
    mockCreate.mockRejectedValue(new Error('server-error'));
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });

    act(() => {
      result.current.form.setField('name', 'Pro');
      result.current.form.setField('slug', 'pro');
    });
    act(() => {
      result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.submitError?.message).toBe('server-error');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
  });

  it('does not call create when the form is invalid', () => {
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });
    // slug left empty -> schema rejects -> buildCreateRequest returns null
    act(() => {
      result.current.form.setField('name', 'Pro');
    });
    act(() => {
      result.current.onSubmit();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('edit mode loads the plan and updates on submit', async () => {
    mockParams = { id: 'pl1' };
    mockGet.mockResolvedValue(samplePlan);
    mockUpdate.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    expect(result.current.isEdit).toBe(true);

    act(() => {
      result.current.onSubmit();
    });
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('pl1', expect.any(Object));
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/plans');
  });

  it('edit-mode submit does not call update when the form is invalid', async () => {
    mockParams = { id: 'pl1' };
    mockGet.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plan).not.toBeNull();
    });
    act(() => {
      result.current.form.setField('name', '');
    });
    act(() => {
      result.current.onSubmit();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('surfaces query errors in edit mode and exposes onRetry', async () => {
    mockParams = { id: 'pl1' };
    mockGet.mockRejectedValue(new Error('load-failed'));
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('load-failed');
    act(() => {
      result.current.onRetry();
    });
  });

  it('onCancel navigates back to the plans list', () => {
    const { result } = renderHook(() => usePlanFormPage(), { wrapper: makeWrapper() });
    act(() => {
      result.current.onCancel();
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/plans');
  });
});
