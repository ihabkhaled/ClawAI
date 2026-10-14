import { CornerDownRight, Flag, Reply } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { ThreadAuthorBadge } from '@/components/threads/community/thread-author-badge';
import { ThreadCommentBody } from '@/components/threads/community/thread-comment-body';
import { ThreadCommentReactions } from '@/components/threads/community/thread-comment-reactions';
import { ThreadPublicReportForm } from '@/components/threads/thread-public-report-form';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadCommentItemProps } from '@/types/thread-community.types';
import { commentAnchorId } from '@/utilities/thread-comment-tree.utility';

/** One comment or reply: who, when, the words, reactions, Reply and Report. */
export function ThreadCommentItem({
  slug,
  comment,
  isReply,
  isAuthenticated,
  loginHref,
  highlightedId,
  actions,
  onReply,
}: ThreadCommentItemProps): ReactElement {
  const { t } = useTranslation();
  const highlighted = highlightedId === comment.id;

  return (
    <article
      id={commentAnchorId(comment.id)}
      data-testid="thread-comment"
      data-highlighted={highlighted ? 'true' : 'false'}
      className={cn(
        'border-border bg-card flex scroll-mt-24 flex-col gap-2 rounded-lg border p-3 transition-shadow motion-reduce:transition-none sm:p-4',
        highlighted ? 'ring-primary ring-2' : '',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <ThreadAuthorBadge author={comment.author} compact={isReply} />
        <RelativeTime value={comment.createdAt} className="text-muted-foreground text-xs" />
      </div>
      {isReply && comment.replyTo ? (
        <p
          className="text-muted-foreground flex items-center gap-1 text-xs"
          data-testid="thread-reply-chip"
        >
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          <span dir="auto" className="min-w-0 truncate">
            {t('chat.threadCommunityReplyingTo', { username: comment.replyTo.username })}
          </span>
        </p>
      ) : null}
      {comment.removed ? (
        <p className="text-muted-foreground text-sm italic" data-testid="thread-comment-removed">
          {t('chat.threadCommunityRemovedComment')}
        </p>
      ) : (
        <>
          <ThreadCommentBody content={comment.content} />
          <div className="flex flex-wrap items-center gap-1">
            <ThreadCommentReactions
              slug={slug}
              comment={comment}
              isAuthenticated={isAuthenticated}
              loginHref={loginHref}
            />
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 sm:min-h-8"
                onClick={() => onReply(comment)}
              >
                <Reply className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                {t('chat.threadCommunityReply')}
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="min-h-11 sm:min-h-8">
                <Link href={loginHref} title={t('chat.threadPublicSignInToJoin')}>
                  <Reply className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                  {t('chat.threadCommunityReply')}
                </Link>
              </Button>
            )}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 sm:min-h-8"
                onClick={() => actions.setReportTarget(comment.id)}
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                {t('chat.threadPublicReportComment')}
              </Button>
            ) : null}
          </div>
        </>
      )}
      {actions.reportTarget === comment.id && !comment.removed ? (
        <ThreadPublicReportForm commentId={comment.id} actions={actions} />
      ) : null}
    </article>
  );
}
