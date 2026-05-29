import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModelAccessPage } from '@/hooks/plans/use-model-access-page';
import type { PlanView } from '@/types';

const mockGet = vi.fn();
const mockUpdateModelAccess = vi.fn();
const mockPush = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/plans.repository', () => ({
  plansRepository: {
    get: (...args: unknown[]) => mockGet(...args),
    updateModelAccess: (...args: unknown[]) => mockUpdateModelAccess(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', role: 'ADMIN' }, isLoading: false, isError: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'pl1' }),
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

const planWithAccess = {
  id: 'pl1',
  modelAccess: [
    {
      provider: 'openai',
      model: 'gpt-4o',
      isAllowed: true,
      allowAsPrimary: true,
      allowAsFallback: true,
      allowAsJudge: false,
      allowInCompare: true,
      dailyTokenLimitOverride: 5000,
    },
  ],
} as unknown as PlanView;

describe('useModelAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates rows from the loaded plan model access', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    expect(result.current.rows[0]?.provider).toBe('openai');
    expect(result.current.rows[0]?.dailyTokenLimitOverride).toBe('5000');
  });

  it('addRow appends an empty editable row', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    act(() => {
      result.current.addRow();
    });
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[1]?.provider).toBe('');
  });

  it('updateRow mutates a single field and removeRow drops the row', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    const rowKey = result.current.rows[0]?.rowKey ?? '';
    act(() => {
      result.current.updateRow(rowKey, 'provider', 'anthropic');
    });
    expect(result.current.rows[0]?.provider).toBe('anthropic');
    act(() => {
      result.current.removeRow(rowKey);
    });
    expect(result.current.rows).toHaveLength(0);
  });

  it('onSave maps rows through to the repository payload and navigates back', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    mockUpdateModelAccess.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(mockUpdateModelAccess).toHaveBeenCalled();
    });
    const payload = mockUpdateModelAccess.mock.calls[0]?.[1] as { models: unknown[] };
    expect(payload.models).toHaveLength(1);
    expect(mockShowToastSuccess).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin/plans');
  });

  it('surfaces save errors via saveError + apiError toast', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    mockUpdateModelAccess.mockRejectedValue(new Error('save-failed'));
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(result.current.saveError?.message).toBe('save-failed');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
  });

  it('maps a blank override to null and a numeric override to a number in the payload', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    mockUpdateModelAccess.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    const rowKey = result.current.rows[0]?.rowKey ?? '';
    act(() => {
      result.current.updateRow(rowKey, 'dailyTokenLimitOverride', '');
    });
    act(() => {
      result.current.addRow();
    });
    const newRowKey = result.current.rows[1]?.rowKey ?? '';
    act(() => {
      result.current.updateRow(newRowKey, 'provider', 'gemini');
      result.current.updateRow(newRowKey, 'model', 'flash');
      result.current.updateRow(newRowKey, 'dailyTokenLimitOverride', '9000');
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(mockUpdateModelAccess).toHaveBeenCalled();
    });
    const payload = mockUpdateModelAccess.mock.calls[0]?.[1] as {
      models: { dailyTokenLimitOverride: number | null }[];
    };
    expect(payload.models[0]?.dailyTokenLimitOverride).toBeNull();
    expect(payload.models[1]?.dailyTokenLimitOverride).toBe(9000);
  });

  it('maps a non-numeric override string to null in the payload', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    mockUpdateModelAccess.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    const rowKey = result.current.rows[0]?.rowKey ?? '';
    act(() => {
      result.current.updateRow(rowKey, 'dailyTokenLimitOverride', 'abc');
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(mockUpdateModelAccess).toHaveBeenCalled();
    });
    const payload = mockUpdateModelAccess.mock.calls[0]?.[1] as {
      models: { dailyTokenLimitOverride: number | null }[];
    };
    expect(payload.models[0]?.dailyTokenLimitOverride).toBeNull();
  });

  it('onCancel navigates back and onRetry is callable', async () => {
    mockGet.mockResolvedValue(planWithAccess);
    const { result } = renderHook(() => useModelAccessPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    act(() => {
      result.current.onCancel();
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/plans');
    act(() => {
      result.current.onRetry();
    });
  });
});
