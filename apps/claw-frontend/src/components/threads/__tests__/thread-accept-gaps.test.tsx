import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  type ThreadGenerationFailure,
  ThreadPublicationType,
} from '@claw/shared-types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import type {
  ThreadRecoveryController,
  ThreadRetryFormController,
} from '@/types/thread-generation-progress.types';
import type { PublicThreadPublication } from '@/types/thread-publication.types';
import { buildRecoveryActions } from '@/utilities/thread-recovery.utility';

import { ThreadGapsNotice } from '../thread-gaps-notice';
import { ThreadGenerationRecoveryPanel } from '../thread-generation-recovery-panel';
import { ThreadGenerationRetryForm } from '../thread-generation-retry-form';
import { ThreadGenerationStepItem } from '../thread-generation-step-item';
import { ThreadPublicArticle } from '../thread-public-article';

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
vi.mock('@/components/shared/relative-time', () => ({ RelativeTime: () => <time /> }));
vi.mock('@/components/threads/thread-reader-body', () => ({
  ThreadReaderBody: () => <div data-testid="reader-body" />,
}));

const GAP_AR = 'المقال لا يحقق طلب الاستشهاد بمصادر أولية مستقلة عن التملق';
const GAP_EN = 'repository files are not in the evidence, so claims cannot be verified';

const failure: ThreadGenerationFailure = {
  code: 'REVIEW_NOT_PASSED',
  failedStage: 'JUDGE',
  roleId: null,
  httpStatus: null,
  retryable: true,
  phase: ThreadFailurePhase.JUDGE,
  failureClass: ThreadFailureClass.EVIDENCE_GAP,
  remedies: [
    ThreadFailureRemedy.RESEARCH_MORE,
    ThreadFailureRemedy.NARROW_CLAIMS,
    ThreadFailureRemedy.ACCEPT_GAPS,
  ],
  review: {
    reviewer: 'JUDGE',
    score: 84,
    minScore: 80,
    blockers: [GAP_AR, GAP_EN],
    blocked: true,
    evidenceGapBlockers: [GAP_AR, GAP_EN],
  },
};

function makeRecovery(overrides: Partial<ThreadRecoveryController> = {}): ThreadRecoveryController {
  return {
    actions: buildRecoveryActions(failure),
    run: vi.fn(),
    pending: null,
    error: null,
    addCreditHref: '/billing',
    ...overrides,
  };
}

function makeRetry(overrides: Partial<ThreadRetryFormController> = {}): ThreadRetryFormController {
  return {
    isOpen: true,
    open: vi.fn(),
    openNarrow: vi.fn(),
    openAcceptGaps: vi.fn(),
    showGapPicker: true,
    gapChoices: [GAP_AR, GAP_EN],
    acceptedGaps: [],
    toggleGap: vi.fn(),
    close: vi.fn(),
    topic: 'A long enough topic',
    isTopicLongEnough: true,
    isTopicTooShort: false,
    setTopic: vi.fn(),
    spendCapUsd: '1',
    setSpendCapUsd: vi.fn(),
    refreshResearch: false,
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

describe('the "Accept these gaps" remedy', () => {
  it('is a third button next to Research more and Narrow the claims, and not a one-click retry', () => {
    const recovery = makeRecovery();
    render(
      <ThreadGenerationRecoveryPanel failure={failure} healing={undefined} recovery={recovery} />,
    );

    const names = screen
      .getAllByRole('button')
      .map((button) => (button.textContent ?? '').split('|')[0]);
    expect(names).toEqual([
      'chat.threadEvidenceRemedyResearchMore',
      'chat.threadEvidenceRemedyNarrow',
      'chat.threadGapsRemedyAccept',
    ]);
    expect(recovery.actions.at(-1)?.oneClick).toBe(false);
  });

  it('runs the ACCEPT_GAPS remedy when pressed', async () => {
    const user = userEvent.setup();
    const recovery = makeRecovery();
    render(
      <ThreadGenerationRecoveryPanel failure={failure} healing={undefined} recovery={recovery} />,
    );

    await user.click(screen.getByRole('button', { name: /chat.threadGapsRemedyAccept/u }));

    expect(recovery.run).toHaveBeenCalledWith(ThreadFailureRemedy.ACCEPT_GAPS);
  });

  it('is absent when the service offered no such remedy', () => {
    const plain = { ...failure, remedies: [ThreadFailureRemedy.RESEARCH_MORE] };
    render(
      <ThreadGenerationRecoveryPanel
        failure={plain}
        healing={undefined}
        recovery={makeRecovery({ actions: buildRecoveryActions(plain) })}
      />,
    );

    expect(screen.queryByText('chat.threadGapsRemedyAccept')).not.toBeInTheDocument();
  });
});

describe('the retry dialog on the evidence gaps', () => {
  it('lists every gap as an unchecked checkbox with the explanation, in the reviewer words', () => {
    render(<ThreadGenerationRetryForm form={makeRetry()} />);

    const group = screen.getByTestId('thread-retry-gaps');
    expect(within(group).getByText('chat.threadGapsExplain')).toBeInTheDocument();
    expect(within(group).getByText('chat.threadGapsPickHint')).toBeInTheDocument();
    const boxes = within(group).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      expect(box).not.toBeChecked();
    }
    const label = within(group).getByText(GAP_AR);
    expect(label).toHaveAttribute('dir', 'auto');
    expect(within(group).getByRole('checkbox', { name: GAP_AR })).toBeInTheDocument();
  });

  it('shows ticked gaps as checked and reports each toggle with its exact text', async () => {
    const user = userEvent.setup();
    const form = makeRetry({ acceptedGaps: [GAP_EN] });
    render(<ThreadGenerationRetryForm form={form} />);

    expect(screen.getByRole('checkbox', { name: GAP_EN })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: GAP_AR }));
    await user.click(screen.getByRole('checkbox', { name: GAP_EN }));

    expect(form.toggleGap).toHaveBeenNthCalledWith(1, GAP_AR, true);
    expect(form.toggleGap).toHaveBeenNthCalledWith(2, GAP_EN, false);
  });

  it('can be used with the keyboard alone', async () => {
    const user = userEvent.setup();
    const form = makeRetry();
    render(<ThreadGenerationRetryForm form={form} />);

    screen.getByRole('checkbox', { name: GAP_AR }).focus();
    await user.keyboard(' ');

    expect(form.toggleGap).toHaveBeenCalledWith(GAP_AR, true);
  });

  it('cannot be sent until at least one gap is ticked', async () => {
    const user = userEvent.setup();
    const none = makeRetry();
    const { rerender } = render(<ThreadGenerationRetryForm form={none} />);
    const submit = screen.getByRole('button', { name: 'chat.threadProgress.retrySubmit' });

    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(none.submit).not.toHaveBeenCalled();

    const ticked = makeRetry({ acceptedGaps: [GAP_AR] });
    rerender(<ThreadGenerationRetryForm form={ticked} />);
    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.retrySubmit' }));
    expect(ticked.submit).toHaveBeenCalledTimes(1);
  });

  it('does not show the list in the ordinary retry dialog', () => {
    render(<ThreadGenerationRetryForm form={makeRetry({ showGapPicker: false })} />);

    expect(screen.queryByTestId('thread-retry-gaps')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'chat.threadProgress.retrySubmit' }),
    ).not.toBeDisabled();
  });
});

describe('the reader notice', () => {
  function publication(overrides: Partial<PublicThreadPublication>): PublicThreadPublication {
    return {
      slug: 's',
      title: 'T',
      contentLocale: Locale.AR,
      publicationType: ThreadPublicationType.ARTICLE,
      content: { markdown: 'x', citations: [] },
      publishedAt: '2026-10-14T00:00:00.000Z',
      viewCount: 0,
      readerCount: 0,
      ...overrides,
    };
  }
  const renderArticle = (overrides: Partial<PublicThreadPublication>) =>
    render(
      <ThreadPublicArticle
        publication={publication(overrides)}
        truncatedLabel=""
        citationsLabel=""
        publishedLabel=""
        viewsLabel=""
      />,
    );

  it('is shown above the article when the gaps were disclosed, outside the article direction', () => {
    const { container } = renderArticle({ gapsDisclosed: true });

    const notice = screen.getByTestId('thread-gaps-notice');
    expect(notice).toHaveTextContent('chat.threadGapsNoticeTitle');
    expect(notice).toHaveTextContent('chat.threadGapsNoticeBody');
    expect(notice).toHaveAttribute('role', 'note');
    const article = container.querySelector('article');
    expect(article).not.toBeNull();
    expect(article?.contains(notice)).toBe(false);
    expect(
      notice.compareDocumentPosition(article as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(article).toHaveAttribute('dir', 'rtl');
  });

  it.each([{ gapsDisclosed: false }, {}])('is absent for %j', (overrides) => {
    renderArticle(overrides);

    expect(screen.queryByTestId('thread-gaps-notice')).not.toBeInTheDocument();
  });

  it('renders on its own with a labelled heading', () => {
    render(<ThreadGapsNotice />);

    expect(screen.getByRole('note', { name: 'chat.threadGapsNoticeTitle' })).toBeInTheDocument();
  });
});

describe('the step list for accepted gaps', () => {
  it('lists the gaps the owner accepted, as the reviewer wrote them', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({
            code: 'ACCEPTED_GAPS',
            roleKind: 'SYSTEM',
            stage: 'RESEARCH',
            excerpt: `${GAP_AR} | ${GAP_EN}`,
          })}
        />
      </ul>,
    );

    expect(screen.getByTestId('thread-progress-step-code')).toHaveTextContent(
      'chat.threadGapsStepAccepted',
    );
    const items = within(screen.getByTestId('thread-step-gaps')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([GAP_AR, GAP_EN]);
    expect(items[0]).toHaveAttribute('dir', 'auto');
  });

  it('says the limitations section is missing, without a raw excerpt button', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({
            code: 'LIMITATIONS_MISSING',
            outcome: 'RETRY',
            roleKind: 'SYSTEM',
            excerpt: null,
          })}
        />
      </ul>,
    );

    expect(screen.getByTestId('thread-progress-step-code')).toHaveTextContent(
      'chat.threadGapsStepMissing',
    );
    expect(screen.queryByTestId('thread-step-gaps')).not.toBeInTheDocument();
  });
});
