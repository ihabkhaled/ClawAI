import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSuggestionRulesPage } from '@/hooks/admin/use-suggestion-rules';

const mockListSuggestionRules = vi.fn();
const mockUpdateSuggestionRule = vi.fn();
const mockDeleteSuggestionRule = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/ai-action-policies.repository', () => ({
  listSuggestionRules: (...args: unknown[]) => mockListSuggestionRules(...args),
  updateSuggestionRule: (...args: unknown[]) => mockUpdateSuggestionRule(...args),
  deleteSuggestionRule: (...args: unknown[]) => mockDeleteSuggestionRule(...args),
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

const sampleRule = {
  id: 'r1',
  name: 'github-pr-large-opened',
  description: null,
  eventType: 'workspace.webhook.received',
  providerRegex: '^GITHUB$',
  contentRegex: '.*',
  actionKindToSuggest: 'SUMMARIZE',
  isActive: true,
  isSystemDefault: true,
  priority: 500,
  perRuleBudgetPerHour: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('useSuggestionRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rules from query', async () => {
    mockListSuggestionRules.mockResolvedValue([sampleRule]);
    const { result } = renderHook(() => useSuggestionRulesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
  });

  it('surfaces query errors', async () => {
    mockListSuggestionRules.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSuggestionRulesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });

  it('toggle success fires toast and invalidates query', async () => {
    mockListSuggestionRules.mockResolvedValue([sampleRule]);
    mockUpdateSuggestionRule.mockResolvedValue({ ...sampleRule, isActive: false });
    const { result } = renderHook(() => useSuggestionRulesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => {
      result.current.onToggleRuleActive('r1', false);
    });

    await waitFor(() => expect(mockShowToastSuccess).toHaveBeenCalled());
    expect(mockUpdateSuggestionRule).toHaveBeenCalledWith('r1', { isActive: false });
    expect(result.current.pendingId).toBeNull();
  });

  it('mutation error sets mutationError', async () => {
    mockListSuggestionRules.mockResolvedValue([sampleRule]);
    mockUpdateSuggestionRule.mockRejectedValue(new Error('rule-locked'));
    const { result } = renderHook(() => useSuggestionRulesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => {
      result.current.onToggleRuleActive('r1', false);
    });

    await waitFor(() => expect(result.current.mutationError?.message).toBe('rule-locked'));
    expect(mockShowToastApiError).toHaveBeenCalled();
  });

  it('clearMutationError resets state', async () => {
    mockListSuggestionRules.mockResolvedValue([sampleRule]);
    mockDeleteSuggestionRule.mockRejectedValue(new Error('cannot-delete'));
    const { result } = renderHook(() => useSuggestionRulesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => {
      result.current.onDeleteRule('r1');
    });
    await waitFor(() => expect(result.current.mutationError).not.toBeNull());

    act(() => {
      result.current.clearMutationError();
    });
    expect(result.current.mutationError).toBeNull();
  });
});
