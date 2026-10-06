'use client';

import type { ReactElement } from 'react';

import { ThreadPublicArticle } from '@/components/threads/thread-public-article';
import { ThreadPublicCommunity } from '@/components/threads/thread-public-community';
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
      <p className="p-6" role="alert">
        {t('chat.threadPublicUnavailable')}
      </p>
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <ThreadPublicArticle
        publication={state.publication}
        truncatedLabel={t('chat.threadPublicTruncated')}
        citationsLabel={t('chat.threadPublicCitations')}
        publishedLabel={t('chat.threadPublicPublished')}
      />
      <ThreadPublicCommunity
        comments={state.comments}
        reactions={state.reactions}
        isAuthenticated={state.isAuthenticated}
        communityLoading={state.communityLoading}
        communityError={state.communityError}
        loginHref={state.loginHref}
        actions={state.actions}
      />
    </main>
  );
}
