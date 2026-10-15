import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadErrorNotice } from '../thread-error-notice';
import { ThreadGenerationFailureCard } from '../thread-generation-failure-card';
import { ThreadGenerationSelectionsView } from '../thread-generation-selections';
import { ThreadGenerationStepItem } from '../thread-generation-step-item';
import { ThreadGenerationTimeline } from '../thread-generation-timeline';

import { makeProgress, makeStep } from './thread-progress.fixture';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));

describe('ThreadErrorNotice', () => {
  it('renders the translated message with its params as an alert', () => {
    render(
      <ThreadErrorNotice
        message={{ key: 'chat.threadProgress.error.genericWithCode', params: { code: 'X_Y' } }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'chat.threadProgress.error.genericWithCode|{"code":"X_Y"}',
    );
  });
});

describe('ThreadGenerationStepItem', () => {
  it('shows outcome, role, model, duration, tokens and a collapsed excerpt', () => {
    render(
      <ul>
        <ThreadGenerationStepItem step={makeStep()} />
      </ul>,
    );

    const item = screen.getByTestId('thread-progress-step');
    expect(item).toHaveAttribute('data-outcome', 'SUCCEEDED');
    expect(item).toHaveTextContent('chat.threadProgress.outcomeSucceeded');
    expect(item).toHaveTextContent('chat.threadProgress.roleAuthor');
    expect(item).toHaveTextContent('OPENAI / gpt-x');
    expect(item).toHaveTextContent('chat.threadProgress.duration|');
    expect(item).toHaveTextContent('chat.threadProgress.durationUnit.s');
    expect(item).toHaveTextContent('chat.threadProgress.tokens|{"input":"120","output":"480"}');
    expect(screen.queryByTestId('thread-progress-excerpt')).not.toBeInTheDocument();
  });

  it('expands and collapses the bounded excerpt', async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <ThreadGenerationStepItem step={makeStep({ excerpt: 'x'.repeat(5000) })} />
      </ul>,
    );

    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.showExcerpt' }));
    expect(screen.getByTestId('thread-progress-excerpt').textContent).toHaveLength(1201);

    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.hideExcerpt' }));
    expect(screen.queryByTestId('thread-progress-excerpt')).not.toBeInTheDocument();
  });

  it('translates the failure code, shows the HTTP status and skips empty parts', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({
            outcome: 'FAILED',
            code: 'PAYG_CREDIT_EXHAUSTED',
            httpStatus: 402,
            excerpt: null,
            durationMs: null,
            inputTokens: null,
            outputTokens: null,
            provider: null,
            model: null,
            stage: 'UNKNOWN_STAGE',
            round: 0,
            roleKind: 'SYSTEM',
          })}
        />
      </ul>,
    );

    const item = screen.getByTestId('thread-progress-step');
    expect(item).toHaveTextContent('chat.threadProgress.code.paygCreditExhausted');
    expect(item).toHaveTextContent('chat.threadProgress.httpStatus|{"status":"402"}');
    expect(item).toHaveTextContent('UNKNOWN_STAGE');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(item).not.toHaveTextContent('chat.threadProgress.duration');
    expect(item).not.toHaveTextContent('chat.threadProgress.tokens');
  });

  it.each(['RETRY', 'FALLBACK', 'SKIPPED'] as const)(
    'does not render the code line of a %s step as an error',
    (outcome) => {
      render(
        <ul>
          <ThreadGenerationStepItem
            step={makeStep({ outcome, code: 'FALLBACK_USED', httpStatus: 429 })}
          />
        </ul>,
      );

      const line = screen.getByTestId('thread-progress-step-code');
      expect(line).toHaveTextContent('chat.threadProgress.code.fallbackUsed');
      expect(line).not.toHaveTextContent('chat.threadProgress.httpStatus');
      expect(line.className).not.toContain('text-destructive');
    },
  );

  it('renders the code line of a FAILED step in the error tone', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({ outcome: 'FAILED', code: 'PROVIDER_ERROR', httpStatus: 500 })}
        />
      </ul>,
    );

    const line = screen.getByTestId('thread-progress-step-code');
    expect(line.className).toContain('text-destructive');
    expect(line).toHaveTextContent('chat.threadProgress.httpStatus|{"status":"500"}');
  });

  it.each([
    ['FORMAT_ALREADY_PRETTY', 'threadReview.formatAlreadyPretty'],
    ['FORMAT_CITATION_LOST', 'threadReview.formatCitationLost'],
    ['FORMAT_TABLE_LOST', 'threadReview.formatTableLost'],
  ])('shows a skipped %s step as a neutral note, not an error', (code, key) => {
    render(
      <ul>
        <ThreadGenerationStepItem step={makeStep({ outcome: 'SKIPPED', code })} />
      </ul>,
    );

    const line = screen.getByTestId('thread-progress-step-code');
    expect(line).toHaveTextContent(key);
    expect(line).not.toHaveTextContent('code.unknown');
    expect(line.className).not.toContain('text-destructive');
    expect(line.getAttribute('data-kind')).toBe('info');
  });

  it('names an unknown FORMAT_ code with the friendly fallback', () => {
    render(
      <ul>
        <ThreadGenerationStepItem step={makeStep({ outcome: 'SKIPPED', code: 'FORMAT_NEW_ONE' })} />
      </ul>,
    );

    expect(screen.getByTestId('thread-progress-step-code')).toHaveTextContent(
      'threadReview.formatUnknown|{"code":"FORMAT_NEW_ONE"}',
    );
  });

  it('hides an empty excerpt and shows one-sided token counts', () => {
    render(
      <ul>
        <ThreadGenerationStepItem
          step={makeStep({ excerpt: '', inputTokens: null, outputTokens: 7, code: 'ODD_ONE' })}
        />
      </ul>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const item = screen.getByTestId('thread-progress-step');
    expect(item).toHaveTextContent('"input":"0","output":"7"');
    expect(item).toHaveTextContent('chat.threadProgress.code.unknown');
  });
});

describe('ThreadGenerationTimeline', () => {
  it('lists every step in order', () => {
    render(<ThreadGenerationTimeline steps={makeProgress().steps} />);
    expect(screen.getAllByTestId('thread-progress-step')).toHaveLength(2);
  });

  it('says so when nothing is recorded yet', () => {
    render(<ThreadGenerationTimeline steps={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('chat.threadProgress.timelineEmpty');
  });
});

describe('ThreadGenerationSelectionsView', () => {
  it('shows topic, cap, every role with provider, model and fallbacks', () => {
    render(<ThreadGenerationSelectionsView selections={makeProgress().selections} />);

    const view = screen.getByTestId('thread-progress-selections');
    expect(view).toHaveTextContent('How heat pumps work');
    expect(view).toHaveTextContent('$1.00');
    expect(view).toHaveTextContent('OPENAI / gpt-x');
    expect(view).toHaveTextContent('chat.threadProgress.fallbacks|{"list":"GEMINI / gem-y"}');
    expect(view).toHaveTextContent('chat.threadProgress.noFallbacks');
    expect(view).toHaveTextContent('chat.threadProgress.roleJudge');
  });

  it('shows translated labels instead of raw slugs and keeps model ids inside Details', () => {
    const base = makeProgress().selections;
    render(
      <ThreadGenerationSelectionsView
        selections={{ ...base, publicationType: 'research-article', contentLocale: 'fr' }}
      />,
    );
    const view = screen.getByTestId('thread-progress-selections');
    expect(view).toHaveTextContent('chat.threadTypeResearchArticle');
    expect(view).not.toHaveTextContent('research-article');
    expect(view).not.toHaveTextContent('author-1');
    expect(view).toHaveTextContent('chat.threadProgress.roleAuthor 1');
    const details = view.querySelectorAll('details');
    expect(details).toHaveLength(base.roles.length);
    expect(details[0]).toHaveTextContent('OPENAI / gpt-x');
  });
});

describe('ThreadGenerationFailureCard', () => {
  const failure = makeProgress().failure;
  if (failure === null) {
    throw new Error('fixture must carry a failure');
  }

  it('names the stage and role, the reason and the next step', () => {
    render(<ThreadGenerationFailureCard failure={failure} roleKind="AUTHOR" />);

    const card = screen.getByTestId('thread-progress-failure');
    expect(card).toHaveTextContent('chat.threadProgress.failureWhere|');
    expect(card).toHaveTextContent('chat.threadProgress.code.paygCreditExhausted');
    expect(card).toHaveTextContent('chat.threadProgress.hint.paygCreditExhausted');
    expect(card).toHaveTextContent('chat.threadProgress.failureRetryable');
    expect(card).toHaveTextContent('chat.threadProgress.httpStatus|{"status":"402"}');
    const details = screen.getByTestId('thread-progress-failure-details');
    expect(details.tagName).toBe('DETAILS');
    expect(details).not.toHaveAttribute('open');
    expect(details).toHaveTextContent('chat.threadProgress.errorCode');
  });

  it('copes with an unknown stage, no role, no status and a non-retryable failure', () => {
    render(
      <ThreadGenerationFailureCard
        failure={{ ...failure, failedStage: 'MYSTERY', httpStatus: null, retryable: false }}
        roleKind={null}
      />,
    );

    const card = screen.getByTestId('thread-progress-failure');
    expect(card).toHaveTextContent('chat.threadProgress.failureWhereNoRole|{"stage":"MYSTERY"}');
    expect(card).toHaveTextContent('chat.threadProgress.failureNotRetryable');
    expect(card).not.toHaveTextContent('chat.threadProgress.httpStatus');
  });
});
