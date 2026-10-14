import type { ThreadGenerationProgress } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThreadProgressPanel } from '@/hooks/threads/use-thread-progress-panel';
import type { ThreadProgressPanelController } from '@/types/thread-generation-progress.types';

import { ThreadGenerationProgressPanel } from '../thread-generation-progress-panel';

import { makeProgress, makeStep } from './thread-progress.fixture';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));
vi.mock('@/hooks/threads/use-thread-progress-panel', () => ({ useThreadProgressPanel: vi.fn() }));
vi.mock('../thread-generation-retry-form', () => ({
  ThreadGenerationRetryForm: () => <div data-testid="retry-form" />,
}));
vi.mock('../thread-generation-delete-dialog', () => ({
  ThreadGenerationDeleteDialog: () => <div data-testid="delete-dialog" />,
}));

function makeController(
  overrides: Partial<ThreadProgressPanelController> = {},
): ThreadProgressPanelController {
  return {
    progress: makeProgress(),
    isLoading: false,
    error: null,
    pollingPaused: false,
    pollingPausedByErrors: false,
    isRunning: false,
    canRetry: true,
    retry: { open: vi.fn() } as unknown as ThreadProgressPanelController['retry'],
    remove: { setOpen: vi.fn() } as unknown as ThreadProgressPanelController['remove'],
    ...overrides,
  };
}

function renderPanel(
  controller: ThreadProgressPanelController,
  props: { canDelete?: boolean; isCancelling?: boolean } = {},
) {
  vi.mocked(useThreadProgressPanel).mockReturnValue(controller);
  const onCancel = vi.fn();
  render(
    <ThreadGenerationProgressPanel
      publicationId="pub-1"
      canDelete={props.canDelete ?? true}
      onCancel={onCancel}
      isCancelling={props.isCancelling ?? false}
    />,
  );
  return { onCancel };
}

describe('ThreadGenerationProgressPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the summary, failure card, selections and every step for a failed job', () => {
    renderPanel(makeController());

    expect(screen.getByTestId('thread-progress-summary')).toHaveTextContent(
      'chat.threadProgress.outcomeFailed',
    );
    expect(screen.getByTestId('thread-progress-summary')).toHaveTextContent(
      '"current":"1","max":"3"',
    );
    expect(screen.getByTestId('thread-progress-summary')).toHaveTextContent('$0.0123');
    expect(screen.getByTestId('thread-progress-failure')).toBeInTheDocument();
    expect(screen.getByTestId('thread-progress-selections')).toBeInTheDocument();
    expect(screen.getAllByTestId('thread-progress-step')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'common.cancel' })).not.toBeInTheDocument();
  });

  it('offers Retry and Delete to the owner of a failed job and wires them up', async () => {
    const user = userEvent.setup();
    const controller = makeController();
    renderPanel(controller);

    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.retry' }));
    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.deleteButton' }));

    expect(controller.retry.open).toHaveBeenCalledTimes(1);
    expect(controller.remove.setOpen).toHaveBeenCalledWith(true);
  });

  it('offers Cancel only while the job runs, and hides retry and failure', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderPanel(
      makeController({
        progress: makeProgress({ status: 'RUNNING', stage: 'RESEARCH', round: 0, failure: null }),
        isRunning: true,
        canRetry: false,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'chat.threadProgress.retry' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('thread-progress-failure')).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-progress-summary')).toHaveTextContent(
      'chat.threadStageResearch',
    );
  });

  it('says the job is still working while it runs, and not once it has failed', () => {
    renderPanel(
      makeController({
        progress: makeProgress({ status: 'RUNNING', failure: null }),
        isRunning: true,
        canRetry: false,
      }),
    );
    expect(screen.getByTestId('thread-progress-still-working')).toHaveTextContent(
      'chat.threadProgress.stillWorking',
    );
  });

  it('does not say still working for a finished job', () => {
    renderPanel(makeController());
    expect(screen.queryByTestId('thread-progress-still-working')).not.toBeInTheDocument();
  });

  it('hides Delete for a published Thread and shows an unknown stage as-is', () => {
    renderPanel(
      makeController({
        progress: makeProgress({ status: 'RUNNING', stage: 'NEW_STAGE', failure: null }),
        canRetry: false,
      }),
      { canDelete: false },
    );

    expect(
      screen.queryByRole('button', { name: 'chat.threadProgress.deleteButton' }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-progress-summary')).toHaveTextContent('NEW_STAGE');
  });

  it('hides Delete while the job is running', () => {
    renderPanel(
      makeController({
        progress: makeProgress({ status: 'RUNNING', failure: null }),
        isRunning: true,
        canRetry: false,
      }),
      { canDelete: true },
    );

    expect(
      screen.queryByRole('button', { name: 'chat.threadProgress.deleteButton' }),
    ).not.toBeInTheDocument();
  });

  it('shows the repeated-error reload hint when polling stopped on errors', () => {
    renderPanel(makeController({ pollingPaused: true, pollingPausedByErrors: true }));
    expect(screen.getByText('chat.threadProgress.pollingErrors')).toBeInTheDocument();
  });

  it('says when live updates stopped', () => {
    renderPanel(makeController({ pollingPaused: true }));
    expect(screen.getByText('chat.threadProgress.pollingPaused')).toBeInTheDocument();
  });

  it('shows loading, then a status-specific error with no private content', () => {
    renderPanel(
      makeController({
        progress: undefined,
        isLoading: true,
        error: { key: 'chat.threadProgress.error.notFound' },
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('common.loading');
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadProgress.error.notFound');
    expect(screen.queryByTestId('thread-progress-selections')).not.toBeInTheDocument();
    expect(screen.queryByTestId('thread-progress-summary')).not.toBeInTheDocument();
  });

  it('disables cancel while the request is in flight', () => {
    renderPanel(
      makeController({
        progress: makeProgress({ status: 'RUNNING', failure: null }),
        isRunning: true,
        canRetry: false,
      }),
      { isCancelling: true },
    );
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });
});

describe('ThreadGenerationProgressPanel queued, spend and action bar', () => {
  beforeEach(() => vi.clearAllMocks());

  function queued() {
    return makeController({
      progress: makeProgress({
        status: 'QUEUED',
        stage: 'SNAPSHOT',
        round: 0,
        attemptCount: 0,
        spentMicroCredits: '0',
        failure: null,
        steps: [],
      }),
      isRunning: true,
      canRetry: false,
    });
  }

  it('says a queued job is waiting, not that it is freezing the chat or still working', () => {
    renderPanel(queued());

    const summary = screen.getByTestId('thread-progress-summary');
    expect(summary).toHaveTextContent('chat.threadProgress.statusQueued');
    expect(summary).not.toHaveTextContent('chat.threadStageSnapshot');
    expect(summary).not.toHaveTextContent('chat.threadProgress.attempt');
    expect(screen.getByTestId('thread-progress-queued')).toHaveTextContent(
      'chat.threadProgress.queuedHint',
    );
    expect(screen.queryByTestId('thread-progress-still-working')).not.toBeInTheDocument();
  });

  it('still lets the owner cancel a queued job', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderPanel(queued());

    await user.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides the spend line until a real amount exists', () => {
    renderPanel(makeController({ progress: makeProgress({ spentMicroCredits: '0' }) }));
    expect(screen.queryByTestId('thread-progress-spent')).not.toBeInTheDocument();
  });

  it('says the calls were included in the plan, with tokens, when spend is zero', () => {
    renderPanel(makeController({ progress: makeProgress({ spentMicroCredits: '0' }) }));
    expect(screen.getByTestId('thread-progress-included')).toHaveTextContent(
      'chat.threadProgress.includedInPlanTokens',
    );
  });

  it('says included without tokens when the steps carry no counts', () => {
    const steps = [makeStep({ inputTokens: null, outputTokens: null })];
    renderPanel(makeController({ progress: makeProgress({ spentMicroCredits: '0', steps }) }));
    expect(screen.getByTestId('thread-progress-included')).toHaveTextContent(
      'chat.threadProgress.includedInPlan',
    );
  });

  it('says nothing about the plan when no call succeeded or money was spent', () => {
    const none = makeProgress({ spentMicroCredits: '0', steps: [] });
    renderPanel(makeController({ progress: none }));
    expect(screen.queryByTestId('thread-progress-included')).not.toBeInTheDocument();
    expect(screen.queryByTestId('thread-progress-spent')).not.toBeInTheDocument();
  });

  it('never shows the included line next to a real spend', () => {
    renderPanel(makeController());
    expect(screen.queryByTestId('thread-progress-included')).not.toBeInTheDocument();
  });

  it('hides the spend line for an unreadable amount', () => {
    renderPanel(makeController({ progress: makeProgress({ spentMicroCredits: 'n/a' }) }));
    expect(screen.queryByTestId('thread-progress-spent')).not.toBeInTheDocument();
  });

  it('shows the spend line once the job has spent something', () => {
    renderPanel(makeController());
    expect(screen.getByTestId('thread-progress-spent')).toHaveTextContent('$0.0123');
  });

  it('keeps the destructive Delete visually separate from Retry in the action bar', () => {
    renderPanel(makeController());
    const retry = screen.getByRole('button', { name: 'chat.threadProgress.retry' });
    const remove = screen.getByRole('button', { name: 'chat.threadProgress.deleteButton' });

    expect(retry.parentElement).toBe(remove.parentElement);
    expect(retry.querySelector('svg')).not.toBeNull();
    expect(remove.querySelector('svg')).not.toBeNull();
    expect(remove.className).toContain('bg-destructive');
  });

  it('tells a Free owner it was not their fault and offers a prominent Retry on us', () => {
    const refunded = { ...makeProgress(), allowanceRefunded: true } as ThreadGenerationProgress;
    renderPanel(makeController({ progress: refunded }));

    expect(screen.getByTestId('thread-progress-platform-failure')).toHaveTextContent(
      'chat.threadProgress.platformFailureNotice',
    );
    expect(
      screen.getByRole('button', { name: 'chat.threadProgress.retryOnUs' }),
    ).toBeInTheDocument();
  });

  it('keeps the plain failure card and Retry when no allowance was refunded', () => {
    renderPanel(makeController());

    expect(screen.queryByTestId('thread-progress-platform-failure')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chat.threadProgress.retry' })).toBeInTheDocument();
  });

  it('shows the real Free spend when the paid figure is zero', () => {
    const free = { ...makeProgress({ spentMicroCredits: '0' }), freeAllowanceMicroUsd: '4500' };
    renderPanel(makeController({ progress: free as ThreadGenerationProgress }));

    expect(screen.getByTestId('thread-progress-spent')).toHaveTextContent('$0.0045');
  });
});
