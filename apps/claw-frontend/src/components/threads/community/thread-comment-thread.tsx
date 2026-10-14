import { ChevronDown } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadCommentComposer } from '@/components/threads/community/thread-comment-composer';
import { ThreadCommentItem } from '@/components/threads/community/thread-comment-item';
import { Button } from '@/components/ui/button';
import { useThreadCommentThread } from '@/hooks/threads/use-thread-comment-thread';
import { useTranslation } from '@/lib/i18n';
import type { ThreadCommentThreadProps } from '@/types/thread-community.types';
import { mentionPrefill } from '@/utilities/thread-mention.utility';

/**
 * A root comment with all of its replies in one list (one visual level, however deep the chain
 * went), a "more replies" button and the reply box under whichever comment is being answered.
 */
export function ThreadCommentThread({
  slug,
  comment,
  isAuthenticated,
  loginHref,
  highlightedId,
  actions,
}: ThreadCommentThreadProps): ReactElement {
  const { t } = useTranslation();
  const thread = useThreadCommentThread(slug, comment);
  const all = [comment, ...comment.replies];

  return (
    <li className="flex flex-col gap-2" data-testid="thread-comment-thread">
      {all.map((entry) => (
        <div
          key={entry.id}
          className={
            entry.id === comment.id ? 'flex flex-col gap-2' : 'ms-4 flex flex-col gap-2 sm:ms-8'
          }
        >
          <ThreadCommentItem
            slug={slug}
            comment={entry}
            isReply={entry.id !== comment.id}
            isAuthenticated={isAuthenticated}
            loginHref={loginHref}
            highlightedId={highlightedId}
            actions={actions}
            onReply={thread.openReply}
          />
          {thread.replyTarget?.id === entry.id ? (
            <ThreadCommentComposer
              slug={slug}
              parentId={entry.id}
              replyingTo={entry.author}
              initialText={mentionPrefill(entry.author)}
              onDone={thread.closeReply}
            />
          ) : null}
        </div>
      ))}
      {thread.remaining > 0 ? (
        <div className="ms-4 flex flex-col items-start gap-1 sm:ms-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-8"
            onClick={thread.loadMore}
            disabled={thread.isLoadingMore}
            isLoading={thread.isLoadingMore}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadCommunityViewMoreReplies', { count: thread.remaining })}
          </Button>
          {thread.loadMoreFailed ? (
            <p role="alert" className="text-destructive text-xs">
              {t('chat.threadCommunityRepliesFailed')}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
