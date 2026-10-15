'use client';

import { Check, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { ThreadChangeRequestChoice } from '@/components/threads/thread-change-request-choice';
import { ThreadChangeRequestRevisionForm } from '@/components/threads/thread-change-request-revision-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { THREAD_CHANGE_REQUEST_ANCHOR_PREFIX } from '@/constants/thread-change-requests.constants';
import {
  THREAD_CHANGE_REQUEST_STATUS_BADGES,
  THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS,
} from '@/constants/thread-publication.constants';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadChangeRequestCardProps } from '@/types/thread-publication.types';

/** One reader suggestion on the owner's review screen: who, when, what, and the owner's answer. */
export function ThreadChangeRequestCard({
  request,
  controller,
  revisionSource,
}: ThreadChangeRequestCardProps): ReactElement {
  const { t } = useTranslation();
  const { resolve, form, highlightedId, chooseAcceptance } = controller;
  const isPending = request.status === ThreadPublicationChangeRequestStatus.Pending;

  return (
    <article
      id={`${THREAD_CHANGE_REQUEST_ANCHOR_PREFIX}${request.id}`}
      data-testid="thread-change-request"
      className={cn(
        'border-border flex scroll-mt-24 flex-col gap-3 rounded-lg border p-4',
        highlightedId === request.id && 'ring-primary ring-2',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">
          {request.requester
            ? `${request.requester.displayName} (@${request.requester.username})`
            : t('chat.threadCrRequesterUnknown')}
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
      <p className="min-w-0 font-medium break-words whitespace-pre-wrap">{request.suggestion}</p>
      {request.ownerResponse ? (
        <p className="text-muted-foreground text-sm">{request.ownerResponse}</p>
      ) : null}
      {request.status === ThreadPublicationChangeRequestStatus.Accepted ? (
        <p className="text-muted-foreground text-sm">{t('chat.threadCrAcceptedWaiting')}</p>
      ) : null}
      {isPending ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor={`thread-response-${request.id}`} className="text-sm font-medium">
              {t('chat.threadCrDeclineReason')}
            </label>
            <Textarea
              id={`thread-response-${request.id}`}
              maxLength={2000}
              value={form.ownerResponses[request.id] ?? ''}
              onChange={(event) => form.setOwnerResponse(request.id, event.target.value)}
              disabled={resolve.isPending}
            />
          </div>
          {form.acceptingRequestId === request.id ? (
            <ThreadChangeRequestRevisionForm
              requestId={request.id}
              controller={controller}
              revisionSource={revisionSource}
            />
          ) : null}
          {form.choosingRequestId === request.id ? (
            <ThreadChangeRequestChoice
              requestId={request.id}
              controller={controller}
              revisionSource={revisionSource}
            />
          ) : null}
          {form.acceptingRequestId !== request.id && form.choosingRequestId !== request.id ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                onClick={() => chooseAcceptance(request.id)}
                disabled={resolve.isPending}
                className="w-full sm:w-auto"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('chat.threadChangeAccept')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  resolve.mutate({
                    requestId: request.id,
                    status: ThreadPublicationChangeRequestStatus.Rejected,
                    ownerResponse: form.ownerResponses[request.id] ?? '',
                  })
                }
                disabled={resolve.isPending}
                isLoading={resolve.isPending}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('chat.threadCrDecline')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
