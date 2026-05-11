import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiActionPoliciesPage } from '@/hooks/admin/use-ai-action-policies';

const mockListAiActionPolicies = vi.fn();
const mockUpdateAiActionPolicy = vi.fn();
const mockDeleteAiActionPolicy = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/ai-action-policies.repository', () => ({
  listAiActionPolicies: (...args: unknown[]) => mockListAiActionPolicies(...args),
  updateAiActionPolicy: (...args: unknown[]) => mockUpdateAiActionPolicy(...args),
  deleteAiActionPolicy: (...args: unknown[]) => mockDeleteAiActionPolicy(...args),
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
  };
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const samplePolicy = {
  id: 'p1',
  name: 'deny-pii',
  kind: 'DENY',
  description: null,
  providerRegex: '.*',
  actionKindRegex: '.*',
  riskMaxLabel: 'CRITICAL',
  riskMaxScore: 100,
  priority: 1000,
  requireReason: false,
  isActive: true,
  isSystemDefault: true,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('useAiActionPoliciesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns policies from query', async () => {
    mockListAiActionPolicies.mockResolvedValue([samplePolicy]);
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('surfaces query errors via error field', async () => {
    mockListAiActionPolicies.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.policies).toEqual([]);
  });

  it('tracks pendingId during toggle and clears on success', async () => {
    mockListAiActionPolicies.mockResolvedValue([samplePolicy]);
    mockUpdateAiActionPolicy.mockResolvedValue({ ...samplePolicy, isActive: false });
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });

    act(() => {
      result.current.onTogglePolicyActive('p1', false);
    });

    await waitFor(() => {
      expect(mockShowToastSuccess).toHaveBeenCalled();
    });
    expect(mockUpdateAiActionPolicy).toHaveBeenCalledWith('p1', { isActive: false });
    expect(result.current.pendingId).toBeNull();
  });

  it('surfaces mutation error via mutationError + apiError toast', async () => {
    mockListAiActionPolicies.mockResolvedValue([samplePolicy]);
    const err = new Error('forbidden');
    mockUpdateAiActionPolicy.mockRejectedValue(err);
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });

    act(() => {
      result.current.onTogglePolicyActive('p1', false);
    });

    await waitFor(() => {
      expect(result.current.mutationError?.message).toBe('forbidden');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
    expect(result.current.pendingId).toBeNull();
  });

  it('clearMutationError resets state', async () => {
    mockListAiActionPolicies.mockResolvedValue([samplePolicy]);
    mockDeleteAiActionPolicy.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });

    act(() => {
      result.current.onDeletePolicy('p1');
    });
    await waitFor(() => {
      expect(result.current.mutationError).not.toBeNull();
    });

    act(() => {
      result.current.clearMutationError();
    });
    expect(result.current.mutationError).toBeNull();
  });

  it('successful delete fires success toast and clears pendingId', async () => {
    mockListAiActionPolicies.mockResolvedValue([samplePolicy]);
    mockDeleteAiActionPolicy.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAiActionPoliciesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });

    act(() => {
      result.current.onDeletePolicy('p1');
    });

    await waitFor(() => {
      expect(mockShowToastSuccess).toHaveBeenCalled();
    });
    expect(mockDeleteAiActionPolicy).toHaveBeenCalledWith('p1');
    expect(result.current.pendingId).toBeNull();
  });
});
