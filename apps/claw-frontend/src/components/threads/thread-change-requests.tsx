'use client';

import { Lightbulb } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadChangeRequestCard } from '@/components/threads/thread-change-request-card';
import { useThreadChangeRequests } from '@/hooks/threads/use-thread-change-requests';
import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeRequestsProps } from '@/types/thread-publication.types';
import { orderChangeRequests } from '@/utilities/thread-change-request-order.utility';

/** The owner's review of reader suggestions: every one with who asked, when, and where it stands. */
export function ThreadChangeRequests(props: ThreadChangeRequestsProps): ReactElement {
  const { revisionSource } = props;
  const { t } = useTranslation();
  const controller = useThreadChangeRequests(props);
  const { requests, resolve } = controller;

  return (
    <section
      id="thread-change-requests"
      aria-labelledby="thread-change-requests-title"
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5"
    >
      <h2
        id="thread-change-requests-title"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <Lightbulb className="h-5 w-5" aria-hidden="true" />
        {t('chat.threadChangeRequests')}
      </h2>
      <p className="text-muted-foreground text-sm">{t('chat.threadCrSectionHint')}</p>
      {requests.isLoading ? <p role="status">{t('common.loading')}</p> : null}
      {requests.isError ? <p role="alert">{t('chat.threadChangeRequestsFailed')}</p> : null}
      {resolve.isError ? <p role="alert">{t('chat.threadChangeDecisionFailed')}</p> : null}
      {requests.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('chat.threadChangeRequestsEmpty')}</p>
      ) : null}
      {orderChangeRequests(requests.data ?? []).map((request) => (
        <ThreadChangeRequestCard
          key={request.id}
          request={request}
          controller={controller}
          revisionSource={revisionSource}
        />
      ))}
    </section>
  );
}
