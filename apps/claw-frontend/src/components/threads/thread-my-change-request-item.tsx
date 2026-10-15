'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { Badge } from '@/components/ui/badge';
import { THREAD_CHANGE_REQUEST_ANCHOR_PREFIX } from '@/constants/thread-change-requests.constants';
import {
  THREAD_CHANGE_REQUEST_STATUS_BADGES,
  THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS,
} from '@/constants/thread-publication.constants';
import { useLocalizedHref } from '@/hooks/common/use-localized-href';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadMyChangeRequestItemProps } from '@/types/thread-publication.types';

/** One of the person's own suggestions: the Thread, what they wrote, the status and the owner's reply. */
export function ThreadMyChangeRequestItem({
  request,
  highlighted,
}: ThreadMyChangeRequestItemProps): ReactElement {
  const { t } = useTranslation();
  const localise = useLocalizedHref();
  const title = request.thread.title === '' ? t('chat.threadCrUntitled') : request.thread.title;

  return (
    <li
      id={`${THREAD_CHANGE_REQUEST_ANCHOR_PREFIX}${request.id}`}
      data-testid="thread-my-change-request"
      className={cn(
        'border-border bg-card flex scroll-mt-24 flex-col gap-3 rounded-lg border p-4',
        highlighted && 'ring-primary ring-2',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">
          {t('chat.threadCrMineOnThread', { title })}
        </p>
        <div className="flex items-center gap-2">
          <RelativeTime value={request.createdAt} className="text-muted-foreground text-xs" />
          <Badge
            variant={THREAD_CHANGE_REQUEST_STATUS_BADGES[request.status].variant}
            className={THREAD_CHANGE_REQUEST_STATUS_BADGES[request.status].className}
          >
            {t(THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS[request.status])}
          </Badge>
        </div>
      </div>
      <p className="min-w-0 break-words whitespace-pre-wrap">{request.suggestion}</p>
      {request.ownerResponse ? (
        <div className="bg-muted/40 rounded-md p-3 text-sm">
          <p className="text-muted-foreground text-xs font-medium">
            {t('chat.threadCrMineOwnerReply')}
          </p>
          <p className="break-words whitespace-pre-wrap">{request.ownerResponse}</p>
        </div>
      ) : null}
      {request.thread.isPublic ? (
        <Link
          href={localise(`/threads/${encodeURIComponent(request.thread.slug)}`)}
          className="text-primary inline-flex min-h-11 items-center text-sm underline"
        >
          {t('chat.threadCrMineOpenThread')}
        </Link>
      ) : null}
    </li>
  );
}
