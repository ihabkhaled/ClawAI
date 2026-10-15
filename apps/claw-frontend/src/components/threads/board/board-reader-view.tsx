'use client';

import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { BoardReaderActions } from '@/components/threads/board/board-reader-actions';
import { ThreadAuthorBadge } from '@/components/threads/community/thread-author-badge';
import { ThreadPublicCommunity } from '@/components/threads/thread-public-community';
import { ThreadReaderBody } from '@/components/threads/thread-reader-body';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import type { BoardReaderViewProps } from '@/types/thread-board-reader.types';
import { safeThreadCitationUrl } from '@/utilities/thread-citation.utility';
import { threadContentDirection } from '@/utilities/thread-content-direction.utility';

export function BoardReaderView({ state }: BoardReaderViewProps): ReactElement {
  const { t } = useTranslation();
  const { publication } = state;

  if (state.isLoading) {
    return (
      <div
        className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6"
        role="status"
        aria-label={t('common.loading')}
        data-testid="board-reader-skeleton"
      >
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state.isNotFound) {
    return (
      <div
        className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 p-4 sm:p-6"
        data-testid="board-reader-not-found"
      >
        <p role="alert">{t('chat.threadPublicUnavailable')}</p>
        <Button asChild variant="outline">
          <Link href="/board">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('chat.threadBoardBack')}
          </Link>
        </Button>
      </div>
    );
  }

  if (state.isError || !publication) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 p-4 sm:p-6">
        <p role="alert">{t('chat.threadPublicLoadFailed')}</p>
        <Button type="button" variant="outline" onClick={state.retry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadBoardRetry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={state.goBack}>
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('chat.threadBoardBack')}
        </Button>
        <nav aria-label={t('chat.threadBoardTitle')} className="min-w-0 flex-1">
          <ol className="text-muted-foreground flex min-w-0 items-center gap-1 text-sm">
            <li>
              <Link href={state.boardHref} className="hover:underline">
                {t('chat.threadBoardNavLabel')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
            </li>
            <li aria-current="page" className="text-foreground min-w-0 truncate">
              {publication.title}
            </li>
          </ol>
        </nav>
      </div>
      <article
        className="border-border bg-card rounded-xl border p-5 sm:p-8"
        lang={publication.contentLocale}
        dir={threadContentDirection(publication.contentLocale)}
      >
        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{publication.title}</h1>
          {publication.owner ? <ThreadAuthorBadge author={publication.owner} /> : null}
          <RelativeTime value={publication.publishedAt} className="text-muted-foreground text-sm" />
        </header>
        <ThreadReaderBody
          markdown={publication.content.markdown}
          title={publication.title}
          contentLocale={publication.contentLocale}
          citations={publication.content.citations}
          truncatedLabel={t('chat.threadPublicTruncated')}
          citationsLabel={t('chat.threadBoardSources', {
            count: publication.content.citations.filter(
              (citation) => safeThreadCitationUrl(citation.url) !== null,
            ).length,
          })}
        />
      </article>
      <BoardReaderActions
        title={publication.title}
        publicUrl={state.publicUrl}
        publicPath={state.publicPath}
        likeCount={state.reactions?.likes ?? 0}
        commentCount={state.comments.length}
        viewCount={publication.viewCount}
      />
      <ThreadPublicCommunity
        slug={publication.slug}
        comments={state.comments}
        highlightedCommentId={state.highlightedCommentId}
        commentMissing={state.commentMissing}
        commentTotal={state.commentTotal}
        hasMoreComments={state.hasMoreComments}
        isLoadingMoreComments={state.isLoadingMoreComments}
        loadMoreComments={state.loadMoreComments}
        reactions={state.reactions}
        isAuthenticated={state.isAuthenticated}
        communityLoading={state.communityLoading}
        communityError={state.communityError}
        loginHref={state.loginHref}
        actions={state.actions}
      />
    </div>
  );
}
