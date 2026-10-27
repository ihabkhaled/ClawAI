import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  type ThreadGenerationFailure,
} from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ThreadRecoveryController,
  ThreadRetryFormController,
} from '@/types/thread-generation-progress.types';

import { ThreadGenerationFailureCard } from '../thread-generation-failure-card';
import { ThreadGenerationRecoveryPanel } from '../thread-generation-recovery-panel';
import { ThreadGenerationRetryForm } from '../thread-generation-retry-form';
import { ThreadGenerationStepItem } from '../thread-generation-step-item';

import { makeStep } from './thread-progress.fixture';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('../thread-model-picker', () => ({
  ThreadModelPicker: () => <div data-testid="role-picker" />,
}));

/** The first of the two blockers the Judge gave in production on 2026-10-27. */
const BLOCKER = 'المقال لا يحقق طلب الاستشهاد بمصادر أولية مستقلة عن التملق واختراق المكافأة';

const blockedFailure: ThreadGenerationFailure = {
  code: 'REVIEW_NOT_PASSED',
  failedStage: 'JUDGE',
  roleId: null,
  httpStatus: null,
  retryable: true,
  phase: ThreadFailurePhase.JUDGE,
  failureClass: ThreadFailureClass.EVIDENCE_GAP,
  remedies: [ThreadFailureRemedy.RESEARCH_MORE, ThreadFailureRemedy.NARROW_CLAIMS],
  review: { reviewer: 'JUDGE', score: 84, minScore: 80, blockers: [BLOCKER], blocked: true },
};

describe('ThreadGenerationFailureCard for a blocked review', () => {
  it('says the review was blocked, not that the score was too low, and quotes the blocker', () => {
    render(<ThreadGenerationFailureCard failure={blockedFailure} roleKind={null} />);

    const card = screen.getByTestId('thread-progress-failure');
    expect(card).toHaveTextContent('chat.threadEvidenceBlockedTitle');
    expect(card).not.toHaveTextContent('chat.threadProgress.code.reviewNotPassed');
    const quote = screen.getByTestId('thread-review-blocker');
    expect(quote).toHaveTextContent(BLOCKER);
    expect(quote).toHaveAttribute('dir', 'auto');
    expect(screen.getByTestId('thread-review-score')).toHaveTextContent(
      'chat.threadEvidenceScoreLine|{"score":"84","min":"80"}',
    );
  });

  it('keeps the plain message when the score really was below the minimum', () => {
    render(
      <ThreadGenerationFailureCard
        failure={{
          ...blockedFailure,
          failureClass: ThreadFailureClass.REVIEW_NOT_PASSED,
          review: { reviewer: 'JUDGE', score: 60, minScore: 80, blockers: [], blocked: false },
        }}
        roleKind={null}
      />,
    );

    const card = screen.getByTestId('thread-progress-failure');
    expect(card).not.toHaveTextContent('chat.threadEvidenceBlockedTitle');
    expect(card).toHaveTextContent('chat.threadProgress.code.reviewNotPassed');
    expect(screen.queryByTestId('thread-review-blocker')).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-review-score')).toHaveTextContent('"score":"60"');
  });

  it('is unchanged for a failure without a review (older service)', () => {
    render(
      <ThreadGenerationFailureCard
        failure={{ ...blockedFailure, review: undefined, failureClass: undefined }}
        roleKind={null}
      />,
    );

    expect(screen.queryByTestId('thread-review-verdict')).not.toBeInTheDocument();
  });
});

describe('ThreadGenerationStepItem for review and research steps', () => {
  it('shows a blocked review as score, minimum and quoted blockers', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({
            roleKind: 'JUDGE',
            stage: 'JUDGE',
            outcome: 'RETRY',
            code: 'JUDGE_BLOCKED',
            excerpt: JSON.stringify({ score: 84, minScore: 80, blockers: [BLOCKER] }),
          })}
        />
      </ul>,
    );

    const item = screen.getByTestId('thread-progress-step');
    expect(item).toHaveTextContent('chat.threadEvidenceStepBlocked');
    expect(item).not.toHaveTextContent('judgeScoreLow');
    expect(screen.getByTestId('thread-review-blocker')).toHaveTextContent(BLOCKER);
    expect(screen.queryByTestId('thread-progress-excerpt')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'chat.threadProgress.showExcerpt' }),
    ).not.toBeInTheDocument();
  });

  it('labels the extra research pass and counts the new sources', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({
            roleKind: 'RESEARCH',
            stage: 'RESEARCH',
            outcome: 'STARTED',
            code: 'EVIDENCE_GAP_RESEARCH',
            excerpt: null,
          })}
        />
        <ThreadGenerationStepItem
          step={makeStep({
            seq: 2,
            roleKind: 'RESEARCH',
            stage: 'RESEARCH',
            code: 'EVIDENCE_GAP_RESEARCH_DONE',
            excerpt: '{"added":3}',
          })}
        />
        <ThreadGenerationStepItem
          step={makeStep({
            seq: 3,
            roleKind: 'RESEARCH',
            stage: 'RESEARCH',
            outcome: 'SKIPPED',
            code: 'EVIDENCE_GAP_RESEARCH_FAILED',
            excerpt: null,
          })}
        />
      </ul>,
    );

    const [looking, found, failed] = screen.getAllByTestId('thread-progress-step-code');
    expect(looking).toHaveTextContent('chat.threadEvidenceStepLooking');
    expect(found).toHaveTextContent('chat.threadEvidenceStepFound|');
    expect(found).toHaveTextContent('"count":"3"');
    expect(failed).toHaveTextContent('chat.threadEvidenceStepFailed');
    expect(
      screen.queryByRole('button', { name: 'chat.threadProgress.showExcerpt' }),
    ).not.toBeInTheDocument();
  });
});

describe('ThreadGenerationRecoveryPanel for an evidence gap', () => {
  const recovery: ThreadRecoveryController = {
    actions: [
      {
        remedy: ThreadFailureRemedy.RESEARCH_MORE,
        labelKey: 'chat.threadEvidenceRemedyResearchMore',
        params: {},
        oneClick: true,
      },
      {
        remedy: ThreadFailureRemedy.NARROW_CLAIMS,
        labelKey: 'chat.threadEvidenceRemedyNarrow',
        params: {},
        oneClick: false,
      },
    ],
    run: vi.fn(),
    pending: null,
    error: null,
    addCreditHref: '/billing',
  };

  it('explains the gap and offers both remedies', async () => {
    const user = userEvent.setup();
    render(
      <ThreadGenerationRecoveryPanel
        failure={blockedFailure}
        healing={undefined}
        recovery={recovery}
      />,
    );

    expect(screen.getByTestId('thread-recovery-reason')).toHaveTextContent(
      'chat.threadEvidenceReasonGap',
    );
    await user.click(
      screen.getByRole('button', { name: /chat\.threadEvidenceRemedyResearchMore/u }),
    );
    await user.click(screen.getByRole('button', { name: /chat\.threadEvidenceRemedyNarrow/u }));
    expect(recovery.run).toHaveBeenNthCalledWith(1, ThreadFailureRemedy.RESEARCH_MORE);
    expect(recovery.run).toHaveBeenNthCalledWith(2, ThreadFailureRemedy.NARROW_CLAIMS);
  });

  it('says a review blocked by a requirement was not a score problem', () => {
    render(
      <ThreadGenerationRecoveryPanel
        failure={{ ...blockedFailure, failureClass: ThreadFailureClass.REVIEW_NOT_PASSED }}
        healing={undefined}
        recovery={recovery}
      />,
    );

    expect(screen.getByTestId('thread-recovery-reason')).toHaveTextContent(
      'chat.threadEvidenceReasonBlocked',
    );
  });
});

function makeRetry(overrides: Partial<ThreadRetryFormController> = {}): ThreadRetryFormController {
  return {
    isOpen: true,
    open: vi.fn(),
    openNarrow: vi.fn(),
    close: vi.fn(),
    topic: 'A long enough topic',
    isTopicLongEnough: true,
    isTopicTooShort: false,
    setTopic: vi.fn(),
    spendCapUsd: '1',
    setSpendCapUsd: vi.fn(),
    refreshResearch: true,
    setRefreshResearch: vi.fn(),
    showNarrowHint: false,
    topicRef: createRef<HTMLTextAreaElement>(),
    onOpenAutoFocus: vi.fn(),
    roles: [],
    changeModel: vi.fn(),
    submit: vi.fn(),
    isSubmitting: false,
    error: null,
    ...overrides,
  };
}

describe('ThreadGenerationRetryForm research option', () => {
  it('shows the checkbox ticked and lets the owner untick it', async () => {
    const user = userEvent.setup();
    const form = makeRetry();
    render(<ThreadGenerationRetryForm form={form} />);

    const box = screen.getByRole('checkbox');
    expect(box).toBeChecked();
    expect(screen.getByTestId('thread-retry-research-more')).toHaveTextContent(
      'chat.threadEvidenceResearchMoreLabel',
    );
    await user.click(box);
    expect(form.setRefreshResearch).toHaveBeenCalledWith(false);
  });

  it('shows the narrowing hint only when it was opened to narrow the claims', () => {
    const { rerender } = render(<ThreadGenerationRetryForm form={makeRetry()} />);
    expect(screen.queryByTestId('thread-retry-narrow-hint')).not.toBeInTheDocument();

    rerender(
      <ThreadGenerationRetryForm
        form={makeRetry({ showNarrowHint: true, refreshResearch: false })}
      />,
    );
    expect(screen.getByTestId('thread-retry-narrow-hint')).toHaveTextContent(
      'chat.threadEvidenceNarrowHint',
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
