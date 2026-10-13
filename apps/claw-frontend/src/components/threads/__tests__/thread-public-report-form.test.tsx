import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import { en } from '@/lib/i18n/locales/en';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import type { ThreadCommunityActionState } from '@/types/thread-publication.types';

import { ThreadPublicReportForm } from '../thread-public-report-form';

// The REAL English dictionary, not a key-echo mock: a mock that returns the key would pass even
// when the component forgot the `chat.` prefix and the person saw `threadPublicReportSPAM`.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => resolveTranslation(en, key, params),
  }),
}));

function createActions(
  overrides: Partial<ThreadCommunityActionState> = {},
): ThreadCommunityActionState {
  return {
    comment: '',
    suggestion: '',
    reportTarget: '',
    reportReason: ThreadPublicationReportReason.Other,
    reportDetails: '',
    isSubmitting: false,
    actionComplete: false,
    actionFailed: false,
    setComment: vi.fn(),
    setSuggestion: vi.fn(),
    setReportTarget: vi.fn(),
    setReportReason: vi.fn(),
    setReportDetails: vi.fn(),
    submitComment: vi.fn(),
    submitChangeRequest: vi.fn(),
    submitReport: vi.fn(),
    setReaction: vi.fn(),
    ...overrides,
  };
}

describe('ThreadPublicReportForm', () => {
  it('shows the selected reason as a translated word, not a raw key', () => {
    render(<ThreadPublicReportForm commentId="" actions={createActions()} />);

    const trigger = screen.getByRole('combobox', { name: 'Reason' });
    expect(trigger).toHaveTextContent('Other');
    expect(trigger.textContent).not.toMatch(/threadPublicReport/u);
  });

  it('lists every reason translated, with no raw keys, and reports the pick', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    render(<ThreadPublicReportForm commentId="" actions={actions} />);

    await user.click(screen.getByRole('combobox', { name: 'Reason' }));
    const list = within(await screen.findByRole('listbox'));

    for (const label of [
      'Spam',
      'Abuse or harassment',
      'Private information',
      'Unsafe content',
      'Other',
    ]) {
      expect(list.getByRole('option', { name: label })).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/threadPublicReport[A-Z]/u);
    await user.click(list.getByRole('option', { name: 'Spam' }));
    expect(actions.setReportReason).toHaveBeenCalledWith(ThreadPublicationReportReason.Spam);
  });

  it('submits through the controller and cancels by clearing the target', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    render(<ThreadPublicReportForm commentId="comment-1" actions={actions} />);

    await user.click(screen.getByRole('button', { name: 'Send report' }));
    expect(actions.submitReport).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.setReportTarget).toHaveBeenCalledWith(null);
  });

  it('uses the shared details field, with its own label', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    render(<ThreadPublicReportForm commentId="comment-1" actions={actions} />);

    await user.type(screen.getByLabelText('Details (optional)'), 'x');

    expect(actions.setReportDetails).toHaveBeenCalledWith('x');
  });
});
