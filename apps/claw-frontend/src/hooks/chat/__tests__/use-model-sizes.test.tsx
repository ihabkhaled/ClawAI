import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModelSizes } from '@/hooks/chat/use-model-sizes';

const mockGetModelSizes = vi.fn();

vi.mock('@/repositories/routing/model-sizes.repository', () => ({
  getModelSizes: (...args: unknown[]) => mockGetModelSizes(...args),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useModelSizes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks a model up by provider and key once the list has arrived', async () => {
    mockGetModelSizes.mockResolvedValue({
      data: [
        {
          provider: 'OPENROUTER',
          modelKey: 'openai/gpt-oss-120b',
          contextWindowTokens: 131_072,
          parameterCountBillions: 117,
          activeParameterCountBillions: 5.1,
        },
      ],
    });

    const { result } = renderHook(() => useModelSizes(), { wrapper });

    await waitFor(() => {
      expect(result.current.lookup('OPENROUTER', 'openai/gpt-oss-120b')).toBeDefined();
    });
    expect(result.current.lookup('OPENROUTER', 'openai/gpt-oss-120b')?.parameterCountBillions).toBe(
      117,
    );
    expect(result.current.lookup('OPENAI', 'gpt-5.4')).toBeUndefined();
  });

  it('asks the server once, however many pickers are open', async () => {
    mockGetModelSizes.mockResolvedValue({ data: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const shared = ({ children }: { children: ReactNode }): ReactElement =>
      React.createElement(QueryClientProvider, { client }, children);

    renderHook(() => useModelSizes(), { wrapper: shared });
    renderHook(() => useModelSizes(), { wrapper: shared });
    renderHook(() => useModelSizes(), { wrapper: shared });

    await waitFor(() => {
      expect(mockGetModelSizes).toHaveBeenCalledTimes(1);
    });
  });

  // A failed lookup must not break a picker: each row falls back to the window it carries.
  it('answers unknown instead of failing when the request fails', async () => {
    mockGetModelSizes.mockRejectedValue(new Error('routing-service down'));

    const { result } = renderHook(() => useModelSizes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.lookup('OPENAI', 'gpt-5.4')).toBeUndefined();
  });
});
