import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useInstantiateChainTemplate,
  useResumeChainRun,
  useRunChain,
} from '@/hooks/workspace-chains/use-chain-mutations';

const mockInstantiateTemplate = vi.fn();
const mockRunChain = vi.fn();
const mockResumeChainRun = vi.fn();

vi.mock('@/repositories/workspace/chain.repository', () => ({
  workspaceChainRepository: {
    instantiateTemplate: (...args: unknown[]) => mockInstantiateTemplate(...args),
    runChain: (...args: unknown[]) => mockRunChain(...args),
    resumeChainRun: (...args: unknown[]) => mockResumeChainRun(...args),
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

describe('useInstantiateChainTemplate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository with key and data, and resolves the created chain', async () => {
    mockInstantiateTemplate.mockResolvedValue({ id: 'chain-1' });
    const { result } = renderHook(() => useInstantiateChainTemplate(), { wrapper: makeWrapper() });

    let created;
    await act(async () => {
      created = await result.current.mutateAsync({
        key: 'ticket-and-notify',
        data: { name: 'My chain', connectorSelections: {} },
      });
    });

    expect(mockInstantiateTemplate).toHaveBeenCalledWith('ticket-and-notify', {
      name: 'My chain',
      connectorSelections: {},
    });
    expect(created).toEqual({ id: 'chain-1' });
  });

  it('surfaces mutation errors', async () => {
    mockInstantiateTemplate.mockRejectedValue(new Error('instantiate-failed'));
    const { result } = renderHook(() => useInstantiateChainTemplate(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current
        .mutateAsync({ key: 'k', data: { name: 'n', connectorSelections: {} } })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error?.message).toBe('instantiate-failed'));
  });
});

describe('useRunChain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository with the chain id and resolves the run view', async () => {
    mockRunChain.mockResolvedValue({ id: 'run-1', status: 'COMPLETED' });
    const { result } = renderHook(() => useRunChain(), { wrapper: makeWrapper() });

    let run;
    await act(async () => {
      run = await result.current.mutateAsync('chain-1');
    });

    expect(mockRunChain).toHaveBeenCalledWith('chain-1');
    expect(run).toEqual({ id: 'run-1', status: 'COMPLETED' });
  });
});

describe('useResumeChainRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository with chainId and runId', async () => {
    mockResumeChainRun.mockResolvedValue({ id: 'run-1', status: 'RUNNING' });
    const { result } = renderHook(() => useResumeChainRun(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ chainId: 'chain-1', runId: 'run-1' });
    });

    expect(mockResumeChainRun).toHaveBeenCalledWith('chain-1', 'run-1');
  });
});
