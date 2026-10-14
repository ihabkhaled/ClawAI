import { ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { useThreadCommentReactions } from '@/hooks/threads/use-thread-comment-reactions';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadCommentReactionsProps } from '@/types/thread-community.types';

/** Like and dislike with live counts. Guests see the counts and are sent to sign in on a click. */
export function ThreadCommentReactions({
  slug,
  comment,
  isAuthenticated,
  loginHref,
}: ThreadCommentReactionsProps): ReactElement {
  const { t } = useTranslation();
  const reactions = useThreadCommentReactions(slug, comment.id);
  const options = [
    {
      value: ThreadPublicationReaction.Like,
      Icon: ThumbsUp,
      count: comment.likes,
      label: t('chat.threadCommunityLikeAria', { count: comment.likes }),
    },
    {
      value: ThreadPublicationReaction.Dislike,
      Icon: ThumbsDown,
      count: comment.dislikes,
      label: t('chat.threadCommunityDislikeAria', { count: comment.dislikes }),
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {options.map(({ value, Icon, count, label }) => {
        const active = comment.viewerReaction === value;
        const body = (
          <>
            <Icon className={cn('h-4 w-4', active ? 'fill-current' : '')} aria-hidden="true" />
            <span className="tabular-nums" data-testid={`comment-${value.toLowerCase()}-count`}>
              {count}
            </span>
          </>
        );
        return isAuthenticated ? (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            className="min-h-11 gap-1.5 px-2.5 motion-reduce:transition-none sm:min-h-8"
            aria-pressed={active}
            aria-label={label}
            disabled={reactions.isPending}
            onClick={() => reactions.toggle(value)}
          >
            {body}
          </Button>
        ) : (
          <Button
            key={value}
            asChild
            size="sm"
            variant="ghost"
            className="min-h-11 gap-1.5 px-2.5 sm:min-h-8"
          >
            <Link
              href={loginHref}
              aria-label={label}
              title={t('chat.threadCommunitySignInToReact')}
            >
              {body}
            </Link>
          </Button>
        );
      })}
      {reactions.isFailed ? (
        <span role="alert" className="text-destructive text-xs">
          {t('chat.threadCommunityReactionFailed')}
        </span>
      ) : null}
    </div>
  );
}
