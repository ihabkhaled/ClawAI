import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceAutomationsPage } from '@/hooks/workspace-chains/use-workspace-automations-page';

const mockListTemplates = vi.fn();
const mockListChains = vi.fn();
const mockListChainRuns = vi.fn();
const mockInstantiateTemplate = vi.fn();
const mockRunChain = vi.fn();
const mockResumeChainRun = vi.fn();
const mockDraftFromNl = vi.fn();
const mockCreate = vi.fn();
const mockListWorkspaceConnectors = vi.fn();

vi.mock('@/repositories/workspace/chain.repository', () => ({
  workspaceChainRepository: {
    listTemplates: (...args: unknown[]) => mockListTemplates(...args),
    listChains: (...args: unknown[]) => mockListChains(...args),
    listChainRuns: (...args: unknown[]) => mockListChainRuns(...args),
    instantiateTemplate: (...args: unknown[]) => mockInstantiateTemplate(...args),
    runChain: (...args: unknown[]) => mockRunChain(...args),
    resumeChainRun: (...args: unknown[]) => mockResumeChainRun(...args),
    draftFromNl: (...args: unknown[]) => mockDraftFromNl(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('@/repositories/workspace/workspace.repository', () => ({
  listWorkspaceConnectors: (...args: unknown[]) => mockListWorkspaceConnectors(...args),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params?.value !== undefined ? `${key}:${String(params.value)}` : key,
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

const sampleTemplate = {
  id: 'tmpl-1',
  key: 'ticket-and-notify',
  name: 'Ticket and notify',
  description: 'desc',
  category: 'productivity',
  requiredProviders: ['JIRA'],
  dslTemplate: { steps: [] },
  version: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const sampleChain = {
  id: 'chain-1',
  userId: 'user-1',
  name: 'My chain',
  description: null,
  dsl: { steps: [] },
  isEnabled: true,
  version: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('useWorkspaceAutomationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTemplates.mockResolvedValue([sampleTemplate]);
    mockListChains.mockResolvedValue([sampleChain]);
    mockListWorkspaceConnectors.mockResolvedValue({
      data: [{ id: 'conn-1', provider: 'JIRA', name: 'Jira', status: 'CONNECTED' }],
    });
  });

  it('loads templates, chains, and maps connectors into the simplified option shape', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    await waitFor(() => expect(result.current.chains).toHaveLength(1));
    await waitFor(() => expect(result.current.connectors).toHaveLength(1));
    expect(result.current.connectors[0]).toEqual({
      id: 'conn-1',
      provider: 'JIRA',
      name: 'Jira',
      status: 'CONNECTED',
    });
  });

  it('opens and closes the instantiate dialog for a given template', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));

    act(() => result.current.openInstantiateDialog(sampleTemplate));
    expect(result.current.instantiateDialogTemplate).toEqual(sampleTemplate);

    act(() => result.current.closeInstantiateDialog());
    expect(result.current.instantiateDialogTemplate).toBeNull();
  });

  it('handleInstantiate does nothing when no template is selected', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));

    await act(async () => {
      await result.current.handleInstantiate({ name: 'x', connectorSelections: {} });
    });

    expect(mockInstantiateTemplate).not.toHaveBeenCalled();
  });

  it('handleInstantiate submits against the open template and closes the dialog', async () => {
    mockInstantiateTemplate.mockResolvedValue(sampleChain);
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));

    act(() => result.current.openInstantiateDialog(sampleTemplate));

    await act(async () => {
      await result.current.handleInstantiate({
        name: 'My chain',
        connectorSelections: { JIRA: 'conn-1' },
      });
    });

    expect(mockInstantiateTemplate).toHaveBeenCalledWith('ticket-and-notify', {
      name: 'My chain',
      connectorSelections: { JIRA: 'conn-1' },
    });
    expect(result.current.instantiateDialogTemplate).toBeNull();
  });

  it('handleRun stores the resulting run view keyed by chain id', async () => {
    mockRunChain.mockResolvedValue({ id: 'run-1', chainId: 'chain-1', status: 'COMPLETED' });
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    await act(async () => {
      await result.current.handleRun('chain-1');
    });

    expect(mockRunChain).toHaveBeenCalledWith('chain-1');
    expect(result.current.lastRunViewByChain['chain-1']).toEqual({
      id: 'run-1',
      chainId: 'chain-1',
      status: 'COMPLETED',
    });
  });

  it('opens the history dialog, loads runs, and handleResume targets the open chain', async () => {
    mockListChainRuns.mockResolvedValue([{ id: 'run-1', status: 'FAILED' }]);
    mockResumeChainRun.mockResolvedValue({ id: 'run-1', status: 'RUNNING' });
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    act(() => result.current.openHistoryDialog('chain-1'));
    expect(result.current.historyDialogChainId).toBe('chain-1');
    await waitFor(() => expect(result.current.runsForHistoryDialog).toHaveLength(1));

    await act(async () => {
      await result.current.handleResume('run-1');
    });
    expect(mockResumeChainRun).toHaveBeenCalledWith('chain-1', 'run-1');

    act(() => result.current.closeHistoryDialog());
    expect(result.current.historyDialogChainId).toBeNull();
  });

  it('handleResume does nothing when no history dialog is open', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    await act(async () => {
      await result.current.handleResume('run-1');
    });

    expect(mockResumeChainRun).not.toHaveBeenCalled();
  });

  it('opens and closes the NL draft dialog, clearing any prior draft', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    act(() => result.current.openNlDraftDialog());
    expect(result.current.isNlDraftDialogOpen).toBe(true);

    act(() => result.current.closeNlDraftDialog());
    expect(result.current.isNlDraftDialogOpen).toBe(false);
    expect(result.current.nlDraft).toBeNull();
  });

  it('handleNlDraft stores the drafted dsl', async () => {
    const dsl = {
      steps: [{ id: 's1', connectorId: 'conn-1', actionType: 'CREATE_TICKET', payload: {} }],
    };
    mockDraftFromNl.mockResolvedValue(dsl);
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    await act(async () => {
      await result.current.handleNlDraft('file a jira ticket');
    });

    expect(mockDraftFromNl).toHaveBeenCalledWith('file a jira ticket');
    expect(result.current.nlDraft).toEqual(dsl);
  });

  it('handleSaveNlDraft does nothing when there is no draft yet', async () => {
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    await act(async () => {
      await result.current.handleSaveNlDraft('My automation');
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handleSaveNlDraft creates the chain from the draft and closes the dialog', async () => {
    const dsl = {
      steps: [{ id: 's1', connectorId: 'conn-1', actionType: 'CREATE_TICKET', payload: {} }],
    };
    mockDraftFromNl.mockResolvedValue(dsl);
    mockCreate.mockResolvedValue(sampleChain);
    const { result } = renderHook(() => useWorkspaceAutomationsPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chains).toHaveLength(1));

    act(() => result.current.openNlDraftDialog());
    await act(async () => {
      await result.current.handleNlDraft('file a jira ticket');
    });
    await act(async () => {
      await result.current.handleSaveNlDraft('My automation');
    });

    expect(mockCreate).toHaveBeenCalledWith({ name: 'My automation', dsl, isEnabled: true });
    expect(result.current.isNlDraftDialogOpen).toBe(false);
    expect(result.current.nlDraft).toBeNull();
  });
});
