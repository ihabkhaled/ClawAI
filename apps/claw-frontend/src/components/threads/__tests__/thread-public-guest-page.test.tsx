import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type {
  ThreadCommunityActionState,
  ThreadReactionSummary,
} from '@/types/thread-publication.types';

import { ThreadPublicBackLink } from '../thread-public-back-link';
import { ThreadPublicCommunity } from '../thread-public-community';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'ar' }),
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    'data-testid'?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const LOGIN = '/login?returnTo=%2Fthreads%2Fclear-writing';
const REACTIONS: ThreadReactionSummary = { likes: 4, dislikes: 1, viewerReaction: null };

function actions(): ThreadCommunityActionState {
  return {
    comment: '',
    suggestion: '',
    reportTarget: null,
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
  };
}

describe('the public Thread page for a guest', () => {
  it('links back to the whole public Board in the reader language', () => {
    render(<ThreadPublicBackLink />);

    expect(screen.getByTestId('thread-back-link')).toHaveAttribute('href', '/ar/threads/board');
    expect(screen.getByText('chat.threadBoardGuestBackToAll')).toBeInTheDocument();
  });

  it('shows counts, and a sign-in prompt for every action instead of the controls', () => {
    render(
      <ThreadPublicCommunity
        comments={[{ id: 'c1', content: 'Nice.', createdAt: '2026-10-05T12:00:00.000Z' }]}
        reactions={REACTIONS}
        isAuthenticated={false}
        communityLoading={false}
        communityError={false}
        loginHref={LOGIN}
        actions={actions()}
      />,
    );

    expect(screen.getByText('Nice.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chat.threadPublicLike (4)' })).toBeDisabled();
    for (const key of [
      'chat.threadBoardGuestSignInToLike',
      'chat.threadBoardGuestSignInToComment',
      'chat.threadBoardGuestSignInToRequestChange',
      'chat.threadBoardGuestSignInToReport',
    ]) {
      expect(screen.getByRole('link', { name: key })).toHaveAttribute('href', LOGIN);
    }
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('does not show the guest prompts to a signed-in reader', () => {
    render(
      <ThreadPublicCommunity
        comments={[]}
        reactions={REACTIONS}
        isAuthenticated
        communityLoading={false}
        communityError={false}
        loginHref={LOGIN}
        actions={actions()}
      />,
    );

    expect(screen.queryByTestId('board-guest-prompts')).toBeNull();
  });
});
