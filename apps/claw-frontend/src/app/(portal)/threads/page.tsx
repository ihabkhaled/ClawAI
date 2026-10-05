'use client';

import type { ReactElement } from 'react';

import { useThreadPublications } from '@/hooks/threads/use-thread-publications';
import { useTranslation } from '@/lib/i18n';

export default function ThreadPublicationsPage(): ReactElement {
  const { t } = useTranslation();
  const { data: publications = [], isLoading, isError } = useThreadPublications();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t('threads')}</h1>
      {isLoading ? <p role="status">{t('loadingThreads')}</p> : null}
      {isError ? <p role="alert">{t('threadPublicationsLoadFailed')}</p> : null}
      {!isLoading && !isError && publications.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('noThreads')}
        </p>
      ) : null}
      {publications.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {publications.map((publication) => (
            <li key={publication.id} className="border-border bg-card rounded-lg border p-4">
              <h2 className="font-medium">{publication.title ?? t('noThreads')}</h2>
              <time className="text-muted-foreground text-xs" dateTime={publication.updatedAt}>
                {new Date(publication.updatedAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
