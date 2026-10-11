import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UNPRICED_SEARCH_DEBOUNCE_MS } from '@/constants/model-cost.constants';
import { ModelPricingSource } from '@/enums/model-pricing-source.enum';
import { useUnpricedModelCosts } from '@/hooks/admin/use-unpriced-model-costs';

const mockListUnpriced = vi.fn();

vi.mock('@/repositories/admin/model-cost.repository', () => ({
  modelCostRepository: {
    listUnpriced: (...args: unknown[]) => mockListUnpriced(...args),
  },
}));

function wrapper(): (props: { children: ReactNode }) => ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

const item = (modelKey: string, inRegistry = true) => ({
  provider: 'CUSTOM',
  modelKey,
  displayName: null,
  pricingSource: ModelPricingSource.UNPRICED,
  inRegistry,
});

describe('useUnpricedModelCosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUnpriced.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({ items: [item(`m-${page}`, false)], total: 60, page, pageSize: 25 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads page 1 and exposes the total and page count', async () => {
    const { result } = renderHook(() => useUnpricedModelCosts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListUnpriced).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: '' });
    expect(result.current.total).toBe(60);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.rows[0]?.inRegistry).toBe(false);
  });

  it('pages forward and back, never past the ends', async () => {
    const { result } = renderHook(() => useUnpricedModelCosts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPreviousPage());
    expect(result.current.page).toBe(1);

    act(() => result.current.onNextPage());
    await waitFor(() => expect(result.current.rows[0]?.modelKey).toBe('m-2'));
    expect(mockListUnpriced).toHaveBeenLastCalledWith({ page: 2, pageSize: 25, search: '' });

    act(() => result.current.onNextPage());
    act(() => result.current.onNextPage());
    expect(result.current.page).toBe(3);

    act(() => result.current.onPreviousPage());
    expect(result.current.page).toBe(2);
  });

  it('debounces the search and returns to page 1', async () => {
    const { result } = renderHook(() => useUnpricedModelCosts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.onNextPage());
    await waitFor(() => expect(result.current.page).toBe(2));
    mockListUnpriced.mockClear();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    act(() => result.current.onSearchChange('gro'));
    act(() => result.current.onSearchChange('grok'));
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('grok');
    expect(mockListUnpriced).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'grok' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNPRICED_SEARCH_DEBOUNCE_MS + 10);
    });
    vi.useRealTimers();

    await waitFor(() =>
      expect(mockListUnpriced).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: 'grok' }),
    );
    expect(mockListUnpriced).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'gro' }));
  });

  it('reports a load failure and retries', async () => {
    mockListUnpriced.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useUnpricedModelCosts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');

    act(() => result.current.onRetry());
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.total).toBe(60);
  });
});
