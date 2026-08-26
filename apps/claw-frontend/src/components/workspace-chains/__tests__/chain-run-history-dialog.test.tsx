import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChainRunHistoryDialog } from '@/components/workspace-chains/chain-run-history-dialog';
import type { WorkspaceChainRun } from '@/types';

const t = (key: string): string => key;

function makeRun(overrides: Partial<WorkspaceChainRun> = {}): WorkspaceChainRun {
  return {
    id: 'run-1',
    chainId: 'chain-1',
    userId: 'user-1',
    status: 'COMPLETED',
    error: null,
    wasResumed: false,
    startedAt: '2026-08-01T00:00:00.000Z',
    finishedAt: '2026-08-01T00:01:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:01:00.000Z',
    ...overrides,
  };
}

describe('ChainRunHistoryDialog', () => {
  it('shows the loading message while loading', () => {
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[]}
        isLoading
        onClose={vi.fn()}
        onResume={vi.fn()}
        isResumePending={false}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.runHistory.loading')).toBeInTheDocument();
  });

  it('shows the empty message when there are no runs', () => {
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[]}
        isLoading={false}
        onClose={vi.fn()}
        onResume={vi.fn()}
        isResumePending={false}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.runHistory.empty')).toBeInTheDocument();
  });

  it('renders run status, wasResumed hint, and error', () => {
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[makeRun({ status: 'FAILED', wasResumed: true, error: 'boom' })]}
        isLoading={false}
        onClose={vi.fn()}
        onResume={vi.fn()}
        isResumePending={false}
        t={t}
      />,
    );
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('workspaceChains.chain.wasResumed')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows a Resume button only for FAILED runs, and calls onResume with the run id', async () => {
    const onResume = vi.fn();
    const user = userEvent.setup();
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[
          makeRun({ id: 'run-2', status: 'FAILED' }),
          makeRun({ id: 'run-3', status: 'COMPLETED' }),
        ]}
        isLoading={false}
        onClose={vi.fn()}
        onResume={onResume}
        isResumePending={false}
        t={t}
      />,
    );
    const resumeButtons = screen.getAllByRole('button', {
      name: 'workspaceChains.runHistory.resume',
    });
    expect(resumeButtons).toHaveLength(1);
    await user.click(resumeButtons[0] as HTMLElement);
    expect(onResume).toHaveBeenCalledWith('run-2');
  });

  it('shows notStarted for runs with no startedAt', () => {
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[makeRun({ startedAt: null })]}
        isLoading={false}
        onClose={vi.fn()}
        onResume={vi.fn()}
        isResumePending={false}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.runHistory.notStarted')).toBeInTheDocument();
  });

  it('disables the Resume button and shows the resuming label while pending', () => {
    render(
      <ChainRunHistoryDialog
        open
        chainId="chain-1"
        runs={[makeRun({ status: 'FAILED' })]}
        isLoading={false}
        onClose={vi.fn()}
        onResume={vi.fn()}
        isResumePending
        t={t}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'workspaceChains.runHistory.resuming' }),
    ).toBeDisabled();
  });
});
