import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChainRow } from '@/components/workspace-chains/chain-row';
import type { ChainRunView, WorkspaceChain } from '@/types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.value !== undefined ? `${key}:${String(params.value)}` : key;

function makeChain(overrides: Partial<WorkspaceChain> = {}): WorkspaceChain {
  return {
    id: 'chain-1',
    userId: 'user-1',
    name: 'Ticket and notify',
    description: null,
    dsl: {
      steps: [{ id: 's1', connectorId: 'conn-1', actionType: 'JIRA_CREATE_ISSUE', payload: {} }],
    },
    isEnabled: true,
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRunView(overrides: Partial<ChainRunView> = {}): ChainRunView {
  return {
    id: 'run-1',
    chainId: 'chain-1',
    status: 'COMPLETED',
    error: null,
    wasResumed: false,
    startedAt: '2026-08-01T00:00:00.000Z',
    finishedAt: '2026-08-01T00:01:00.000Z',
    steps: [],
    ...overrides,
  };
}

describe('ChainRow', () => {
  it('renders the chain name and step count', () => {
    render(
      <ChainRow
        chain={makeChain()}
        onRun={vi.fn()}
        onViewRuns={vi.fn()}
        isRunPending={false}
        lastRunView={null}
        t={t}
      />,
    );
    expect(screen.getByText('Ticket and notify')).toBeInTheDocument();
    expect(screen.getByText('workspaceChains.chain.stepCount:1')).toBeInTheDocument();
  });

  it('shows the disabled badge when the chain is not enabled and disables the Run button', () => {
    render(
      <ChainRow
        chain={makeChain({ isEnabled: false })}
        onRun={vi.fn()}
        onViewRuns={vi.fn()}
        isRunPending={false}
        lastRunView={null}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.chain.disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'workspaceChains.chain.run' })).toBeDisabled();
  });

  it('shows the wasResumed hint and error message for the last run', () => {
    render(
      <ChainRow
        chain={makeChain()}
        onRun={vi.fn()}
        onViewRuns={vi.fn()}
        isRunPending={false}
        lastRunView={makeRunView({ status: 'FAILED', wasResumed: true, error: 'boom' })}
        t={t}
      />,
    );
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('workspaceChains.chain.wasResumed')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('calls onRun with the chain id when Run is clicked', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(
      <ChainRow
        chain={makeChain()}
        onRun={onRun}
        onViewRuns={vi.fn()}
        isRunPending={false}
        lastRunView={null}
        t={t}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'workspaceChains.chain.run' }));
    expect(onRun).toHaveBeenCalledWith('chain-1');
  });

  it('calls onViewRuns with the chain id when View Runs is clicked', async () => {
    const onViewRuns = vi.fn();
    const user = userEvent.setup();
    render(
      <ChainRow
        chain={makeChain()}
        onRun={vi.fn()}
        onViewRuns={onViewRuns}
        isRunPending={false}
        lastRunView={null}
        t={t}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'workspaceChains.chain.viewRuns' }));
    expect(onViewRuns).toHaveBeenCalledWith('chain-1');
  });

  it('shows the running label and disables Run while a run is pending', () => {
    render(
      <ChainRow
        chain={makeChain()}
        onRun={vi.fn()}
        onViewRuns={vi.fn()}
        isRunPending
        lastRunView={null}
        t={t}
      />,
    );
    const runButton = screen.getByRole('button', { name: 'workspaceChains.chain.running' });
    expect(runButton).toBeDisabled();
  });
});
