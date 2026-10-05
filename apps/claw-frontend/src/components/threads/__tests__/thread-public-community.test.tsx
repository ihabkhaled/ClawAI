import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type {
  PublicThreadComment,
  ThreadCommunityActionState,
  ThreadReactionSummary,
} from '@/types/thread-publication.types';

import { ThreadPublicCommunity } from '../thread-public-community';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const comments: PublicThreadComment[] = [
  { id: 'comment-1', content: 'Helpful detail.', createdAt: '2026-10-05T12:00:00.000Z' },
];
const reactions: ThreadReactionSummary = { likes: 4, dislikes: 1, viewerReaction: null };

function createActions(reportTarget: string | null = null): ThreadCommunityActionState {
  return {
    comment: '',
    suggestion: '',
    reportTarget,
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

function renderCommunity(isAuthenticated: boolean, actions = createActions()) {
  render(
    <ThreadPublicCommunity
      comments={comments}
      reactions={reactions}
      isAuthenticated={isAuthenticated}
      communityLoading={false}
      communityError={false}
      loginHref="/login?returnTo=%2Fthreads%2Fclear-writing"
      actions={actions}
    />,
  );
  return actions;
}

describe('ThreadPublicCommunity', () => {
  it('shows anonymous comments and a sign-in path without reader identities', () => {
    renderCommunity(false);

    expect(screen.getByText('Helpful detail.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'threadPublicSignInToJoin' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fthreads%2Fclear-writing',
    );
    expect(screen.queryByLabelText('threadPublicAddComment')).not.toBeInTheDocument();
    expect(screen.queryByText(/@|user name/i)).not.toBeInTheDocument();
  });

  it('offers authenticated reactions, comments, change requests, and comment reporting', async () => {
    const user = userEvent.setup();
    const actions = renderCommunity(true, createActions('comment-1'));

    await user.click(screen.getByRole('button', { name: 'threadPublicLike (4)' }));
    expect(actions.setReaction).toHaveBeenCalledWith(ThreadPublicationReaction.Like);
    await user.click(screen.getByRole('button', { name: 'threadPublicReportComment' }));
    expect(actions.setReportTarget).toHaveBeenCalledWith('comment-1');
    expect(screen.getByLabelText('threadPublicReportReason')).toBeInTheDocument();
  });

  it('submits comments and change requests through the controller', async () => {
    const actions = createActions();
    renderCommunity(true, actions);

    const commentForm = screen.getByLabelText('threadPublicAddComment').closest('form');
    if (!commentForm) {
      throw new Error('Comment form not found');
    }
    fireEvent.submit(commentForm);
    await waitFor(() => expect(actions.submitComment).toHaveBeenCalledOnce());

    const changeForm = screen.getByLabelText('threadPublicChangeRequest').closest('form');
    if (!changeForm) {
      throw new Error('Change request form not found');
    }
    fireEvent.submit(changeForm);
    await waitFor(() => expect(actions.submitChangeRequest).toHaveBeenCalledOnce());
  });
});
