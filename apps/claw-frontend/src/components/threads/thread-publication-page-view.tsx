'use client';

import type { ReactElement } from 'react';

import { ThreadExportPanel } from '@/components/threads/thread-export-panel';
import { ThreadPublicArticle } from '@/components/threads/thread-public-article';
import { ThreadPublicBackLink } from '@/components/threads/thread-public-back-link';
import { ThreadPublicCommunity } from '@/components/threads/thread-public-community';
import { ThreadShareMenu } from '@/components/threads/thread-share-menu';
import { THREAD_PUBLIC_EXPORT_OPTIONS } from '@/constants/thread-publication.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadPublicPageViewProps } from '@/types/thread-publication.types';

export function ThreadPublicPageView({ state }: ThreadPublicPageViewProps): ReactElement {
  const { t } = useTranslation();
  if (state.isLoading) {
    return (
      <p className="p-6" role="status">
        {t('common.loading')}
      </p>
    );
  }
  if (state.isNotFound) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-4 py-8 sm:px-6">
        <p role="alert">{t('chat.threadPublicUnavailable')}</p>
        <ThreadPublicBackLink />
      </div>
    );
  }
  if (state.isError || !state.publication) {
    return (
      <p className="p-6" role="alert">
        {t('chat.threadPublicLoadFailed')}
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <ThreadPublicBackLink />
      <ThreadPublicArticle
        publication={state.publication}
        truncatedLabel={t('chat.threadPublicTruncated')}
        citationsLabel={t('chat.threadPublicCitations')}
        publishedLabel={t('chat.threadPublicPublished')}
        viewsLabel={t('chat.threadPublicViews', {
          views: String(state.publication.viewCount),
          readers: String(state.publication.readerCount),
        })}
      />
      {state.shareUrl === null ? null : (
        <ThreadShareMenu url={state.shareUrl} title={state.publication.title} />
      )}
      <ThreadExportPanel
        baseName={state.publication.slug}
        options={THREAD_PUBLIC_EXPORT_OPTIONS}
        buildFile={state.buildExportFile}
        showPdf
      />
      <ThreadPublicCommunity
        slug={state.publication.slug}
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
