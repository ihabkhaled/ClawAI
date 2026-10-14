import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  ThreadHealingResult,
  ThreadHealingStrategy,
  type ThreadGenerationFailure,
} from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ThreadRecoveryController } from '@/types/thread-generation-progress.types';

import { ThreadGenerationHealingNotice } from '../thread-generation-healing-notice';
import { ThreadGenerationRecoveryPanel } from '../thread-generation-recovery-panel';

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

const failure: ThreadGenerationFailure = {
  code: 'OUTPUT_INVALID',
  failedStage: 'AUTHOR_DRAFTS',
  roleId: 'author-1',
  httpStatus: null,
  retryable: true,
  phase: ThreadFailurePhase.AUTHOR,
  failureClass: ThreadFailureClass.WRONG_SHAPE,
  remedies: [ThreadFailureRemedy.TRY_SUGGESTED_MODEL, ThreadFailureRemedy.ADD_CREDIT],
  suggestedModel: { provider: 'GEMINI', model: 'flash' },
};

const recovery = (overrides: Partial<ThreadRecoveryController> = {}): ThreadRecoveryController => ({
  actions: [
    {
      remedy: ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
      labelKey: 'chat.threadProgress.recovery.remedy.trySuggested',
      params: { model: 'GEMINI / flash' },
      oneClick: true,
    },
    {
      remedy: ThreadFailureRemedy.ADD_CREDIT,
      labelKey: 'chat.threadProgress.recovery.remedy.addCredit',
      params: {},
      oneClick: false,
    },
  ],
  run: vi.fn(),
  pending: null,
  error: null,
  addCreditHref: '/billing',
  ...overrides,
});

const healing = {
  active: false,
  attempts: [
    {
      seq: 3,
      phase: ThreadFailurePhase.AUTHOR,
      roleId: 'author-1',
      strategy: ThreadHealingStrategy.STRICT_PROMPT,
      failureClass: ThreadFailureClass.WRONG_SHAPE,
      provider: 'OPENROUTER',
      model: 'a',
      result: ThreadHealingResult.FAILED,
    },
  ],
};

describe('ThreadGenerationRecoveryPanel', () => {
  it('names the phase, the reason, what was tried and the remedies', () => {
    render(
      <ThreadGenerationRecoveryPanel failure={failure} healing={healing} recovery={recovery()} />,
    );

    expect(screen.getByTestId('thread-recovery-phase')).toHaveTextContent(
      'chat.threadProgress.recovery.phase.author',
    );
    expect(screen.getByTestId('thread-recovery-reason')).toHaveTextContent(
      'chat.threadProgress.recovery.reason.wrongShape',
    );
    expect(screen.getByTestId('thread-recovery-tried')).toHaveTextContent(
      'chat.threadProgress.code.healStrictPrompt',
    );
    expect(screen.getByTestId('thread-recovery-tried')).toHaveTextContent('OPENROUTER / a');
    expect(screen.getByRole('button')).toHaveTextContent('GEMINI / flash');
  });

  it('runs the remedy on click and shows Add credit as a link to billing', async () => {
    const run = vi.fn();
    render(
      <ThreadGenerationRecoveryPanel
        failure={failure}
        healing={undefined}
        recovery={recovery({ run })}
      />,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(run).toHaveBeenCalledWith(ThreadFailureRemedy.TRY_SUGGESTED_MODEL);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/billing');
    expect(screen.getByText('chat.threadProgress.recovery.triedNone')).toBeInTheDocument();
  });

  it('disables the buttons while a remedy is running', () => {
    render(
      <ThreadGenerationRecoveryPanel
        failure={failure}
        healing={undefined}
        recovery={recovery({ pending: ThreadFailureRemedy.TRY_SUGGESTED_MODEL })}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders nothing for a failure from an older service', () => {
    const { container } = render(
      <ThreadGenerationRecoveryPanel
        failure={{ ...failure, failureClass: undefined, phase: undefined }}
        healing={undefined}
        recovery={recovery()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ThreadGenerationHealingNotice', () => {
  it('says the service is retrying with a different model', () => {
    render(
      <ThreadGenerationHealingNotice
        healing={{
          active: true,
          attempts: [
            {
              ...healing.attempts[0]!,
              strategy: ThreadHealingStrategy.CROSS_PROVIDER,
              result: ThreadHealingResult.PENDING,
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('thread-progress-healing')).toHaveTextContent(
      'chat.threadProgress.recovery.retryingModel',
    );
  });

  it('renders nothing when nothing is being healed', () => {
    const { container } = render(<ThreadGenerationHealingNotice healing={healing} />);
    expect(container).toBeEmptyDOMElement();
  });
});
