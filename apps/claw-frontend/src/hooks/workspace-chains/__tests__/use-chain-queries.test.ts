import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChainRuns } from '@/hooks/workspace-chains/use-chain-runs';
import { useChainTemplates } from '@/hooks/workspace-chains/use-chain-templates';
import { useChains } from '@/hooks/workspace-chains/use-chains';

const mockListTemplates = vi.fn();
const mockListChains = vi.fn();
const mockListChainRuns = vi.fn();

vi.mock('@/repositories/workspace/chain.repository', () => ({
  workspaceChainRepository: {
    listTemplates: (...args: unknown[]) => mockListTemplates(...args),
    listChains: (...args: unknown[]) => mockListChains(...args),
    listChainRuns: (...args: unknown[]) => mockListChainRuns(...args),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useChainTemplates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns templates once loaded', async () => {
    mockListTemplates.mockResolvedValue([{ id: 'tmpl-1' }]);
    const { result } = renderHook(() => useChainTemplates(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.isError).toBe(false);
  });

  it('surfaces query errors', async () => {
    mockListTemplates.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useChainTemplates(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.templates).toEqual([]);
  });
});

describe('useChains', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns chains once loaded and exposes a refetch function', async () => {
    mockListChains.mockResolvedValue([{ id: 'chain-1' }]);
    const { result } = renderHook(() => useChains(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useChainRuns', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not query when chainId is null', () => {
    const { result } = renderHook(() => useChainRuns(null), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.runs).toEqual([]);
    expect(mockListChainRuns).not.toHaveBeenCalled();
  });

  it('queries runs for the given chainId when set', async () => {
    mockListChainRuns.mockResolvedValue([{ id: 'run-1' }]);
    const { result } = renderHook(() => useChainRuns('chain-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.runs).toHaveLength(1));
    expect(mockListChainRuns).toHaveBeenCalledWith('chain-1');
  });
});
