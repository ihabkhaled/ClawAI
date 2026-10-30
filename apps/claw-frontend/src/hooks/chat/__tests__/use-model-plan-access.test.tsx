import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModelPlanAccess } from '@/hooks/chat/use-model-plan-access';
import type { ConnectorModel } from '@/types';

const mockGetModelAccess = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { getModelAccess: (...args: unknown[]) => mockGetModelAccess(...args) },
}));

const models = [
  { provider: 'OLLAMA', modelKey: 'kimi-k3' },
  { provider: 'GROK', modelKey: 'grok-4.7' },
] as unknown as ConnectorModel[];

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useModelPlanAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('locks exactly the models the server says the plan does not allow', async () => {
    mockGetModelAccess.mockResolvedValue([
      { provider: 'OLLAMA', model: 'kimi-k3', allowed: true },
      { provider: 'GROK', model: 'grok-4.7', allowed: false },
    ]);

    const { result } = renderHook(() => useModelPlanAccess(models), { wrapper });

    await waitFor(() => {
      expect(result.current.isLocked('GROK', 'grok-4.7')).toBe(true);
    });
    expect(result.current.isLocked('OLLAMA', 'kimi-k3')).toBe(false);
    expect(mockGetModelAccess).toHaveBeenCalledWith([
      { provider: 'OLLAMA', model: 'kimi-k3' },
      { provider: 'GROK', model: 'grok-4.7' },
    ]);
  });

  it('locks nothing while the answer is loading or when the lookup fails', async () => {
    mockGetModelAccess.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useModelPlanAccess(models), { wrapper });

    expect(result.current.isLocked('GROK', 'grok-4.7')).toBe(false);
    await waitFor(() => {
      expect(mockGetModelAccess).toHaveBeenCalled();
    });
    expect(result.current.isLocked('GROK', 'grok-4.7')).toBe(false);
  });

  it('does not ask when there are no cloud models', () => {
    renderHook(() => useModelPlanAccess([]), { wrapper });

    expect(mockGetModelAccess).not.toHaveBeenCalled();
  });
});
