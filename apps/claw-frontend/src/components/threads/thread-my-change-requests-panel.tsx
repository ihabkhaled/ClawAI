'use client';

import type { ReactElement } from 'react';

import { ThreadMyChangeRequestItem } from '@/components/threads/thread-my-change-request-item';
import { useThreadChangeRequestHighlight } from '@/hooks/threads/use-thread-change-request-highlight';
import { useThreadMyChangeRequests } from '@/hooks/threads/use-thread-my-change-requests';
import { useTranslation } from '@/lib/i18n';

/** "My suggestions": every change the person suggested to someone else's Thread, with its status. */
export function ThreadMyChangeRequestsPanel(): ReactElement {
  const { t } = useTranslation();
  const { data: requests = [], isLoading, isError } = useThreadMyChangeRequests();
  const highlightedId = useThreadChangeRequestHighlight(requests.map((request) => request.id));

  return (
    <section aria-labelledby="thread-my-change-requests-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 id="thread-my-change-requests-title" className="text-2xl font-semibold">
          {t('chat.threadCrMineTitle')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('chat.threadCrMineIntro')}</p>
      </div>
      {isLoading ? <p role="status">{t('common.loading')}</p> : null}
      {isError ? <p role="alert">{t('chat.threadCrMineLoadFailed')}</p> : null}
      {!isLoading && !isError && requests.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('chat.threadCrMineEmpty')}
        </p>
      ) : null}
      {requests.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <ThreadMyChangeRequestItem
              key={request.id}
              request={request}
              highlighted={highlightedId === request.id}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
