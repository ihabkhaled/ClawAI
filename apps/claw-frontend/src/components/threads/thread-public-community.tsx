import Link from 'next/link';
import type { FormEvent, ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadCommunityPanelProps } from '@/types/thread-publication.types';

import { ThreadPublicReportForm } from './thread-public-report-form';

export function ThreadPublicCommunity({
  comments,
  reactions,
  isAuthenticated,
  communityLoading,
  communityError,
  loginHref,
  actions,
}: ThreadCommunityPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="thread-public-community-title" className="flex flex-col gap-5">
      <h2 id="thread-public-community-title" className="text-xl font-semibold">
        {t('threadPublicComments')} ({comments.length})
      </h2>
      <section aria-labelledby="thread-public-reactions-title" className="flex flex-col gap-3">
        <h3 id="thread-public-reactions-title" className="text-lg font-semibold">
          {t('threadPublicReactions')}
        </h3>
        {reactions ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={
                reactions.viewerReaction === ThreadPublicationReaction.Like ? 'default' : 'outline'
              }
              aria-pressed={reactions.viewerReaction === ThreadPublicationReaction.Like}
              disabled={!isAuthenticated || actions.isSubmitting}
              onClick={() =>
                actions.setReaction(
                  reactions.viewerReaction === ThreadPublicationReaction.Like
                    ? null
                    : ThreadPublicationReaction.Like,
                )
              }
            >
              {t('threadPublicLike')} ({reactions.likes})
            </Button>
            <Button
              type="button"
              variant={
                reactions.viewerReaction === ThreadPublicationReaction.Dislike
                  ? 'default'
                  : 'outline'
              }
              aria-pressed={reactions.viewerReaction === ThreadPublicationReaction.Dislike}
              disabled={!isAuthenticated || actions.isSubmitting}
              onClick={() =>
                actions.setReaction(
                  reactions.viewerReaction === ThreadPublicationReaction.Dislike
                    ? null
                    : ThreadPublicationReaction.Dislike,
                )
              }
            >
              {t('threadPublicDislike')} ({reactions.dislikes})
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!isAuthenticated || actions.isSubmitting}
              onClick={() => actions.setReaction(null)}
            >
              {t('threadPublicRemoveReaction')}
            </Button>
          </div>
        ) : null}
      </section>
      {communityLoading ? <p role="status">{t('common.loading')}</p> : null}
      {communityError ? <p role="alert">{t('threadPublicCommunityFailed')}</p> : null}
      {comments.length === 0 && !communityLoading ? (
        <p className="text-muted-foreground">{t('threadPublicNoComments')}</p>
      ) : null}
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="border-border flex flex-col gap-3 rounded-md border p-4"
        >
          <p className="break-words whitespace-pre-wrap">{comment.content}</p>
          <time className="text-muted-foreground text-xs" dateTime={comment.createdAt}>
            {comment.createdAt.slice(0, 10)}
          </time>
          {isAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => actions.setReportTarget(comment.id)}
            >
              {t('threadPublicReportComment')}
            </Button>
          ) : null}
          {actions.reportTarget === comment.id ? (
            <ThreadPublicReportForm commentId={comment.id} actions={actions} />
          ) : null}
        </article>
      ))}
      {isAuthenticated ? (
        <>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              actions.submitComment();
            }}
          >
            <label htmlFor="thread-public-comment">{t('threadPublicAddComment')}</label>
            <Textarea
              id="thread-public-comment"
              required
              maxLength={5000}
              value={actions.comment}
              onChange={(event) => actions.setComment(event.target.value)}
              disabled={actions.isSubmitting}
            />
            <Button type="submit" disabled={actions.isSubmitting} isLoading={actions.isSubmitting}>
              {t('threadPublicPostComment')}
            </Button>
          </form>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              actions.submitChangeRequest();
            }}
          >
            <label htmlFor="thread-public-change-request">{t('threadPublicChangeRequest')}</label>
            <Textarea
              id="thread-public-change-request"
              required
              maxLength={5000}
              value={actions.suggestion}
              onChange={(event) => actions.setSuggestion(event.target.value)}
              disabled={actions.isSubmitting}
            />
            <Button type="submit" disabled={actions.isSubmitting} isLoading={actions.isSubmitting}>
              {t('threadPublicSubmitChange')}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.setReportTarget('')}
            disabled={actions.isSubmitting}
          >
            {t('threadPublicReportArticle')}
          </Button>
          {actions.reportTarget === '' ? (
            <ThreadPublicReportForm commentId="" actions={actions} />
          ) : null}
          {actions.actionComplete ? <p role="status">{t('threadPublicActionComplete')}</p> : null}
          {actions.actionFailed ? <p role="alert">{t('threadPublicActionFailed')}</p> : null}
        </>
      ) : (
        <Link className="text-primary w-fit underline" href={loginHref}>
          {t('threadPublicSignInToJoin')}
        </Link>
      )}
    </section>
  );
}
