import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { threadCommentFixture } from '@/test/fixtures/thread-comment.fixture';
import type { ThreadCommentNode } from '@/types/thread-community.types';
import type { ThreadCommunityActionState } from '@/types/thread-publication.types';

import { ThreadCommentThread } from '../thread-comment-thread';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const ADA = { username: 'ada', displayName: 'Ada Lovelace' };
const BOB = { username: 'bob', displayName: 'Bob' };

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

function renderThread(
  root: ThreadCommentNode,
  isAuthenticated = true,
  highlightedId: string | null = null,
): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ul>
        <ThreadCommentThread
          slug="s"
          comment={root}
          isAuthenticated={isAuthenticated}
          loginHref="/login"
          highlightedId={highlightedId}
          actions={actions()}
        />
      </ul>
    </QueryClientProvider>,
  );
}

const ROOT = threadCommentFixture({
  id: 'c1',
  author: ADA,
  content: 'Root text',
  likes: 3,
  replyCount: 4,
  hasMoreReplies: true,
  replies: [
    threadCommentFixture({
      id: 'r1',
      parentId: 'c1',
      rootId: 'c1',
      author: BOB,
      replyTo: ADA,
      content: '@ada nice',
      mentions: [{ username: 'ada' }],
    }),
    threadCommentFixture({
      id: 'r2',
      parentId: 'r1',
      rootId: 'c1',
      author: ADA,
      replyTo: BOB,
      content: '@bob thanks',
      mentions: [{ username: 'bob' }],
    }),
  ],
});

describe('ThreadCommentThread', () => {
  it('shows names, @usernames, anchors and one flat reply list with reply chips', () => {
    renderThread(ROOT);

    expect(document.getElementById('comment-c1')).not.toBeNull();
    expect(document.getElementById('comment-r2')).not.toBeNull();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('thread-reply-chip')).toHaveLength(2);
    expect(screen.getByText('chat.threadCommunityReplyingTo:bob')).toBeInTheDocument();
    expect(screen.getAllByTestId('thread-mention').map((node) => node.textContent)).toEqual([
      '@ada',
      '@bob',
    ]);
  });

  it('renders a chip only for a username the server resolved', () => {
    renderThread(
      threadCommentFixture({
        content: 'hi @ada and @nobody_zz',
        mentions: [{ username: 'ada' }],
      }),
    );
    expect(screen.getAllByTestId('thread-mention').map((node) => node.textContent)).toEqual([
      '@ada',
    ]);
    expect(screen.getByTestId('thread-comment-thread')).toHaveTextContent('@nobody_zz');
  });

  it('names an unknown author as a Member', () => {
    renderThread(threadCommentFixture({ author: null }));
    expect(screen.getByText('chat.threadCommunityMember')).toBeInTheDocument();
  });

  it('never turns comment text into markup', () => {
    renderThread(threadCommentFixture({ content: '<img src=x onerror=alert(1)> @<b>x</b>' }));
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });

  it('opens a reply box pre-filled with @username under the answered reply', async () => {
    const user = userEvent.setup();
    renderThread(ROOT);
    const reply = document.getElementById('comment-r1');
    if (!reply) {
      throw new Error('reply missing');
    }

    await user.click(within(reply).getByRole('button', { name: 'chat.threadCommunityReply' }));

    expect(screen.getByRole('textbox')).toHaveValue('@bob ');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('offers "view more replies" with the number still to load', () => {
    renderThread(ROOT);
    expect(
      screen.getByRole('button', { name: 'chat.threadCommunityViewMoreReplies:2' }),
    ).toBeInTheDocument();
  });

  it('shows counts to a guest and sends the click to sign-in', () => {
    renderThread(ROOT, false);
    const like = screen.getAllByRole('link', { name: 'chat.threadCommunityLikeAria:3' })[0];
    expect(like).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('marks the linked comment', () => {
    renderThread(ROOT, true, 'r2');
    expect(document.getElementById('comment-r2')).toHaveAttribute('data-highlighted', 'true');
    expect(document.getElementById('comment-r1')).toHaveAttribute('data-highlighted', 'false');
  });

  it('shows a removed comment as a stub with no actions', () => {
    renderThread(threadCommentFixture({ removed: true, content: '[removed]', likes: 4 }));
    expect(screen.getByTestId('thread-comment-removed')).toHaveTextContent(
      'chat.threadCommunityRemovedComment',
    );
    expect(screen.queryByRole('button', { name: 'chat.threadCommunityReply' })).toBeNull();
    expect(screen.queryByText('[removed]')).toBeNull();
  });
});

describe('ThreadCommentThread reply box shortcut', () => {
  it('posts the reply with Ctrl+Enter', async () => {
    const add = vi
      .spyOn(threadPublicationsRepository, 'addPublicComment')
      .mockResolvedValue(threadCommentFixture({ id: 'new' }));
    const user = userEvent.setup();
    renderThread(threadCommentFixture({ id: 'c1', author: ADA }));
    await user.click(
      screen.getAllByRole('button', { name: /threadCommunityReply/u })[0] as HTMLElement,
    );
    const box = screen.getByRole('textbox');
    await user.type(box, 'thanks');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(add).toHaveBeenCalledTimes(1);
  });
});
