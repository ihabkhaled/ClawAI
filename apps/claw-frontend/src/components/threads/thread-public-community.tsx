import { Flag, Lightbulb, LogIn, MessageSquare, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent, ReactElement } from 'react';

import { BoardGuestPrompts } from '@/components/threads/board/board-guest-prompts';
import { ThreadCommentThread } from '@/components/threads/community/thread-comment-thread';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { useThreadCommentValidation } from '@/hooks/threads/use-thread-comment-validation';
import { useTranslation } from '@/lib/i18n';
import type { ThreadCommunityPanelProps } from '@/types/thread-publication.types';
import { submitOnShortcut } from '@/utilities/submit-shortcut.utility';

import { ThreadPublicReportForm } from './thread-public-report-form';

export function ThreadPublicCommunity({
  slug,
  comments,
  highlightedCommentId,
  commentMissing = false,
  commentTotal,
  hasMoreComments,
  isLoadingMoreComments,
  loadMoreComments,
  reactions,
  isAuthenticated,
  communityLoading,
  communityError,
  loginHref,
  actions,
}: ThreadCommunityPanelProps): ReactElement {
  const { t } = useTranslation();
  const validation = useThreadCommentValidation(
    actions.comment,
    actions.submitComment,
    actions.setComment,
  );
  const liked = reactions?.viewerReaction === ThreadPublicationReaction.Like;
  const disliked = reactions?.viewerReaction === ThreadPublicationReaction.Dislike;

  return (
    <section
      data-no-print
      aria-labelledby="thread-public-community-title"
      className="flex flex-col gap-5"
    >
      <h2 id="thread-public-community-title" className="text-xl font-semibold">
        {t('chat.threadPublicComments')} ({commentTotal ?? comments.length})
      </h2>
      <section aria-labelledby="thread-public-reactions-title" className="flex flex-col gap-3">
        <h3 id="thread-public-reactions-title" className="text-lg font-semibold">
          {t('chat.threadPublicReactions')}
        </h3>
        {reactions ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={liked ? 'default' : 'outline'}
              aria-pressed={liked}
              title={liked ? t('chat.threadPublicRemoveReaction') : undefined}
              disabled={!isAuthenticated || actions.isSubmitting}
              onClick={() => actions.setReaction(liked ? null : ThreadPublicationReaction.Like)}
            >
              <ThumbsUp className={liked ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />
              {t('chat.threadPublicLike')} ({reactions.likes})
            </Button>
            <Button
              type="button"
              variant={disliked ? 'default' : 'outline'}
              aria-pressed={disliked}
              title={disliked ? t('chat.threadPublicRemoveReaction') : undefined}
              disabled={!isAuthenticated || actions.isSubmitting}
              onClick={() =>
                actions.setReaction(disliked ? null : ThreadPublicationReaction.Dislike)
              }
            >
              <ThumbsDown
                className={disliked ? 'h-4 w-4 fill-current' : 'h-4 w-4'}
                aria-hidden="true"
              />
              {t('chat.threadPublicDislike')} ({reactions.dislikes})
            </Button>
          </div>
        ) : null}
      </section>
      {commentMissing ? (
        <p role="status" className="text-muted-foreground" data-testid="thread-comment-missing">
          {t('chat.threadCommunityCommentGone')}
        </p>
      ) : null}
      {communityLoading ? <p role="status">{t('common.loading')}</p> : null}
      {communityError ? <p role="alert">{t('chat.threadPublicCommunityFailed')}</p> : null}
      {comments.length === 0 && !communityLoading ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('chat.threadPublicNoComments')}
        </p>
      ) : null}
      {comments.length > 0 ? (
        <ul className="flex flex-col gap-4" data-testid="thread-comment-list">
          {comments.map((comment) => (
            <ThreadCommentThread
              key={comment.id}
              slug={slug}
              comment={comment}
              isAuthenticated={isAuthenticated}
              loginHref={loginHref}
              highlightedId={highlightedCommentId}
              actions={actions}
            />
          ))}
        </ul>
      ) : null}
      {hasMoreComments ? (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-fit"
          onClick={loadMoreComments}
          disabled={isLoadingMoreComments}
          isLoading={isLoadingMoreComments}
        >
          {t('chat.threadCommunityLoadMoreComments')}
        </Button>
      ) : null}
      {isAuthenticated ? (
        <>
          <form
            noValidate
            className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              validation.handleSubmit();
            }}
          >
            <label
              htmlFor="thread-public-comment"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t('chat.threadPublicAddComment')}
            </label>
            <Textarea
              id="thread-public-comment"
              ref={validation.textareaRef}
              required
              aria-invalid={validation.isEmpty}
              aria-describedby={validation.isEmpty ? 'thread-public-comment-error' : undefined}
              maxLength={5000}
              onKeyDown={(event) => submitOnShortcut(event, validation.handleSubmit)}
              value={actions.comment}
              onChange={(event) => validation.handleChange(event.target.value)}
              disabled={actions.isSubmitting}
            />
            {validation.isEmpty ? (
              <p id="thread-public-comment-error" role="alert" className="text-destructive text-sm">
                {t('chat.threadPublicCommentRequired')}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={actions.isSubmitting}
              isLoading={actions.isSubmitting}
              className="w-full sm:w-fit"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              {t('chat.threadPublicPostComment')}
            </Button>
          </form>
          <form
            className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              actions.submitChangeRequest();
            }}
          >
            <label
              htmlFor="thread-public-change-request"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              {t('chat.threadPublicChangeRequest')}
            </label>
            <Textarea
              id="thread-public-change-request"
              required
              maxLength={5000}
              value={actions.suggestion}
              onChange={(event) => actions.setSuggestion(event.target.value)}
              disabled={actions.isSubmitting}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={actions.isSubmitting}
              isLoading={actions.isSubmitting}
              className="w-full sm:w-fit"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              {t('chat.threadPublicSubmitChange')}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-fit"
            onClick={() => actions.setReportTarget('')}
            disabled={actions.isSubmitting}
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadPublicReportArticle')}
          </Button>
          {actions.reportTarget === '' ? (
            <ThreadPublicReportForm commentId="" actions={actions} />
          ) : null}
          {actions.actionComplete ? (
            <p role="status">{t('chat.threadPublicActionComplete')}</p>
          ) : null}
          {actions.actionFailed ? (
            <p role="alert">{t(actions.actionErrorKey ?? 'chat.threadPublicActionFailed')}</p>
          ) : null}
        </>
      ) : (
        <>
          <Button asChild variant="outline" className="w-full sm:w-fit">
            <Link href={loginHref}>
              <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              {t('chat.threadPublicSignInToJoin')}
            </Link>
          </Button>
          <BoardGuestPrompts signInHref={loginHref} />
        </>
      )}
    </section>
  );
}
