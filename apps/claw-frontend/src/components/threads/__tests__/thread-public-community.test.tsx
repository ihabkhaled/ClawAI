import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import {
  COMMUNITY_PAGING_PROPS,
  threadCommentFixture,
} from '@/test/fixtures/thread-comment.fixture';
import type {
  PublicThreadComment,
  ThreadCommunityActionState,
  ThreadReactionSummary,
} from '@/types/thread-publication.types';

import { ThreadPublicCommunity } from '../thread-public-community';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const comments: PublicThreadComment[] = [threadCommentFixture()];
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
    actionErrorKey: null,
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

function renderCommunity(
  isAuthenticated: boolean,
  actions = createActions(),
  summary: ThreadReactionSummary = reactions,
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThreadPublicCommunity
        {...COMMUNITY_PAGING_PROPS}
        comments={comments}
        reactions={summary}
        isAuthenticated={isAuthenticated}
        communityLoading={false}
        communityError={false}
        loginHref="/login?returnTo=%2Fthreads%2Fclear-writing"
        actions={actions}
      />
    </QueryClientProvider>,
  );
  return actions;
}

describe('ThreadPublicCommunity', () => {
  it('shows anonymous comments and a sign-in path without reader identities', () => {
    renderCommunity(false);

    expect(screen.getByText('Helpful detail.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.threadPublicSignInToJoin' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fthreads%2Fclear-writing',
    );
    expect(screen.queryByLabelText('chat.threadPublicAddComment')).not.toBeInTheDocument();
    expect(screen.queryByText(/@|user name/i)).not.toBeInTheDocument();
  });

  it('offers authenticated reactions, comments, change requests, and comment reporting', async () => {
    const user = userEvent.setup();
    const actions = renderCommunity(true, createActions('comment-1'));

    await user.click(screen.getByRole('button', { name: 'chat.threadPublicLike (4)' }));
    expect(actions.setReaction).toHaveBeenCalledWith(ThreadPublicationReaction.Like);
    await user.click(screen.getByRole('button', { name: 'chat.threadPublicReportComment' }));
    expect(actions.setReportTarget).toHaveBeenCalledWith('comment-1');
    expect(screen.getByLabelText('chat.threadPublicReportReason')).toBeInTheDocument();
  });

  it('submits comments and change requests through the controller', async () => {
    const actions = createActions();
    actions.comment = 'A real comment.';
    renderCommunity(true, actions);

    const commentForm = screen.getByLabelText('chat.threadPublicAddComment').closest('form');
    if (!commentForm) {
      throw new Error('Comment form not found');
    }
    fireEvent.submit(commentForm);
    await waitFor(() => expect(actions.submitComment).toHaveBeenCalledOnce());

    const changeForm = screen.getByLabelText('chat.threadPublicChangeRequest').closest('form');
    if (!changeForm) {
      throw new Error('Change request form not found');
    }
    fireEvent.submit(changeForm);
    await waitFor(() => expect(actions.submitChangeRequest).toHaveBeenCalledOnce());
  });
});

describe('ThreadPublicCommunity reactions and controls', () => {
  it('highlights the own like of the viewer and removes it with the same button', async () => {
    const user = userEvent.setup();
    const actions = renderCommunity(true, createActions(), {
      likes: 4,
      dislikes: 1,
      viewerReaction: ThreadPublicationReaction.Like,
    });

    const like = screen.getByRole('button', { name: 'chat.threadPublicLike (4)' });
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'chat.threadPublicDislike (1)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(like).toHaveAttribute('title', 'chat.threadPublicRemoveReaction');
    await user.click(like);
    expect(actions.setReaction).toHaveBeenCalledWith(null);
  });

  it('switches from a like to a dislike in one click', async () => {
    const user = userEvent.setup();
    const actions = renderCommunity(true, createActions(), {
      likes: 4,
      dislikes: 1,
      viewerReaction: ThreadPublicationReaction.Like,
    });

    await user.click(screen.getByRole('button', { name: 'chat.threadPublicDislike (1)' }));

    expect(actions.setReaction).toHaveBeenCalledWith(ThreadPublicationReaction.Dislike);
  });

  it('no longer has a separate Remove reaction button', () => {
    renderCommunity(true);
    expect(screen.queryByRole('button', { name: 'chat.threadPublicRemoveReaction' })).toBeNull();
  });

  it('disables reactions for a signed-out reader and offers sign-in as a button-styled link', () => {
    renderCommunity(false);

    expect(screen.getByRole('button', { name: 'chat.threadPublicLike (4)' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'chat.threadPublicSignInToJoin' }).className).toContain(
      'inline-flex',
    );
  });

  it('reports the article from a labelled ghost button and opens the report form', async () => {
    const user = userEvent.setup();
    const actions = renderCommunity(true);

    await user.click(screen.getByRole('button', { name: 'chat.threadPublicReportArticle' }));

    expect(actions.setReportTarget).toHaveBeenCalledWith('');
  });

  it('keeps the comment and suggestion forms in shared fields with icon buttons', () => {
    renderCommunity(true);

    expect(
      screen.getByRole('button', { name: 'chat.threadPublicPostComment' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'chat.threadPublicSubmitChange' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('chat.threadPublicAddComment').tagName).toBe('TEXTAREA');
  });

  it('shows an inline alert, focuses the textarea and sends nothing for a blank comment', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    actions.comment = '   ';
    renderCommunity(true, actions);

    await user.click(screen.getByRole('button', { name: 'chat.threadPublicPostComment' }));

    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadPublicCommentRequired');
    expect(screen.getByLabelText('chat.threadPublicAddComment')).toHaveFocus();
    expect(screen.getByLabelText('chat.threadPublicAddComment')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(actions.submitComment).not.toHaveBeenCalled();
  });

  it('submits a non-blank comment without an alert', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    actions.comment = 'Looks right.';
    renderCommunity(true, actions);

    await user.click(screen.getByRole('button', { name: 'chat.threadPublicPostComment' }));

    expect(actions.submitComment).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ThreadPublicCommunity heading, shortcut and missing link', () => {
  it('submits the comment form with Ctrl+Enter and Cmd+Enter', async () => {
    const user = userEvent.setup();
    const actions = createActions();
    actions.comment = 'Looks right.';
    renderCommunity(true, actions);
    const box = document.getElementById('thread-public-comment') as HTMLElement;

    box.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    await user.keyboard('{Enter}');

    expect(actions.submitComment).toHaveBeenCalledTimes(2);
  });

  it('counts replies in the heading and says so when the linked comment is gone', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ThreadPublicCommunity
          {...COMMUNITY_PAGING_PROPS}
          comments={comments}
          commentTotal={8}
          commentMissing
          reactions={reactions}
          isAuthenticated={false}
          communityLoading={false}
          communityError={false}
          loginHref="/login"
          actions={createActions()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('(8)');
    expect(screen.getByTestId('thread-comment-missing')).toHaveTextContent(
      'chat.threadCommunityCommentGone',
    );
  });
});
