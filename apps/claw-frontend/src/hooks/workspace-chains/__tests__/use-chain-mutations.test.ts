import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateChain,
  useDraftChainFromNl,
  useInstantiateChainTemplate,
  useResumeChainRun,
  useRunChain,
} from '@/hooks/workspace-chains/use-chain-mutations';

const mockInstantiateTemplate = vi.fn();
const mockRunChain = vi.fn();
const mockResumeChainRun = vi.fn();
const mockDraftFromNl = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/repositories/workspace/chain.repository', () => ({
  workspaceChainRepository: {
    instantiateTemplate: (...args: unknown[]) => mockInstantiateTemplate(...args),
    runChain: (...args: unknown[]) => mockRunChain(...args),
    resumeChainRun: (...args: unknown[]) => mockResumeChainRun(...args),
    draftFromNl: (...args: unknown[]) => mockDraftFromNl(...args),
    create: (...args: unknown[]) => mockCreate(...args),
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

describe('useDraftChainFromNl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository with the prompt and resolves the draft dsl', async () => {
    const dsl = {
      steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
    };
    mockDraftFromNl.mockResolvedValue(dsl);
    const { result } = renderHook(() => useDraftChainFromNl(), { wrapper: makeWrapper() });

    let draft;
    await act(async () => {
      draft = await result.current.mutateAsync('file a jira ticket');
    });

    expect(mockDraftFromNl).toHaveBeenCalledWith('file a jira ticket');
    expect(draft).toEqual(dsl);
  });

  it('surfaces draft errors', async () => {
    mockDraftFromNl.mockRejectedValue(new Error('draft-failed'));
    const { result } = renderHook(() => useDraftChainFromNl(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error?.message).toBe('draft-failed'));
  });
});

describe('useCreateChain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repository with the create payload and resolves the new chain', async () => {
    mockCreate.mockResolvedValue({ id: 'chain-1' });
    const { result } = renderHook(() => useCreateChain(), { wrapper: makeWrapper() });

    const dsl = {
      steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
    };
    let created;
    await act(async () => {
      created = await result.current.mutateAsync({ name: 'My chain', dsl, isEnabled: true });
    });

    expect(mockCreate).toHaveBeenCalledWith({ name: 'My chain', dsl, isEnabled: true });
    expect(created).toEqual({ id: 'chain-1' });
  });
});
