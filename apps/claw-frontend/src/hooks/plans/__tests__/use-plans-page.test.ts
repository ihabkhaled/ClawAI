import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlansPage } from '@/hooks/plans/use-plans-page';
import type { PlanView } from '@/types';

const mockList = vi.fn();
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
const mockSetDefault = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    list: (...args: unknown[]) => mockList(...args),
    activate: (...args: unknown[]) => mockActivate(...args),
    deactivate: (...args: unknown[]) => mockDeactivate(...args),
    setDefault: (...args: unknown[]) => mockSetDefault(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN' },
    isLoading: false,
    isError: false,
    error: null,
  }),
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

const samplePlan = { id: 'pl1', name: 'Pro', isActive: true } as unknown as PlanView;

describe('usePlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces plans from the query', async () => {
    mockList.mockResolvedValue([samplePlan]);
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    expect(result.current.isError).toBe(false);
  });

  it('surfaces query errors', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.plans).toEqual([]);
  });

  it('onActivate calls the repo, fires success toast and clears pendingId', async () => {
    mockList.mockResolvedValue([samplePlan]);
    mockActivate.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    act(() => {
      result.current.onActivate('pl1');
    });
    await waitFor(() => {
      expect(mockShowToastSuccess).toHaveBeenCalled();
    });
    expect(mockActivate).toHaveBeenCalledWith('pl1');
    expect(result.current.pendingId).toBeNull();
  });

  it('onDeactivate calls the repo and clears pendingId', async () => {
    mockList.mockResolvedValue([samplePlan]);
    mockDeactivate.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    act(() => {
      result.current.onDeactivate('pl1');
    });
    await waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledWith('pl1');
    });
    expect(result.current.pendingId).toBeNull();
  });

  it('onSetDefault calls the repo', async () => {
    mockList.mockResolvedValue([samplePlan]);
    mockSetDefault.mockResolvedValue(samplePlan);
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    act(() => {
      result.current.onSetDefault('pl1');
    });
    await waitFor(() => {
      expect(mockSetDefault).toHaveBeenCalledWith('pl1');
    });
  });

  it('surfaces mutation errors via mutationError + apiError toast', async () => {
    mockList.mockResolvedValue([samplePlan]);
    mockActivate.mockRejectedValue(new Error('forbidden'));
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    act(() => {
      result.current.onActivate('pl1');
    });
    await waitFor(() => {
      expect(result.current.mutationError?.message).toBe('forbidden');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
    expect(result.current.pendingId).toBeNull();
  });

  it('clearMutationError resets the error state', async () => {
    mockList.mockResolvedValue([samplePlan]);
    mockActivate.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    act(() => {
      result.current.onActivate('pl1');
    });
    await waitFor(() => {
      expect(result.current.mutationError).not.toBeNull();
    });
    act(() => {
      result.current.clearMutationError();
    });
    expect(result.current.mutationError).toBeNull();
  });

  it('onRetry refetches the plans list', async () => {
    mockList.mockResolvedValue([samplePlan]);
    const { result } = renderHook(() => usePlansPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.plans).toHaveLength(1);
    });
    mockList.mockClear();
    act(() => {
      result.current.onRetry();
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });
});
