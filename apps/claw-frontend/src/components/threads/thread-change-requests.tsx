'use client';

import { Check, Lightbulb, Send, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  THREAD_CHANGE_REQUEST_STATUS_BADGES,
  THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS,
} from '@/constants/thread-publication.constants';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { useThreadChangeRequests } from '@/hooks/threads/use-thread-change-requests';
import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeRequestsProps } from '@/types/thread-publication.types';

export function ThreadChangeRequests(props: ThreadChangeRequestsProps): ReactElement {
  const { revisionSource } = props;
  const { t } = useTranslation();
  const { requests, resolve, form, beginAcceptance, cancelAcceptance } =
    useThreadChangeRequests(props);

  return (
    <section
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
      {requests.isLoading ? <p role="status">{t('common.loading')}</p> : null}
      {requests.isError ? <p role="alert">{t('chat.threadChangeRequestsFailed')}</p> : null}
      {resolve.isError ? <p role="alert">{t('chat.threadChangeDecisionFailed')}</p> : null}
      {requests.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('chat.threadChangeRequestsEmpty')}</p>
      ) : null}
      {requests.data?.map((request) => (
        <article
          key={request.id}
          className="border-border flex flex-col gap-3 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 font-medium break-words">{request.suggestion}</p>
            <Badge
              variant={THREAD_CHANGE_REQUEST_STATUS_BADGES[request.status].variant}
              className={THREAD_CHANGE_REQUEST_STATUS_BADGES[request.status].className}
            >
              {t(THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS[request.status])}
            </Badge>
          </div>
          {request.ownerResponse ? (
            <p className="text-muted-foreground text-sm">{request.ownerResponse}</p>
          ) : null}
          {request.status === ThreadPublicationChangeRequestStatus.Pending ? (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor={`thread-response-${request.id}`} className="text-sm font-medium">
                  {t('chat.threadResponseToRequester')}
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
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    resolve.mutate({
                      requestId: request.id,
                      status: ThreadPublicationChangeRequestStatus.Accepted,
                      ownerResponse: form.ownerResponses[request.id] ?? '',
                    });
                  }}
                >
                  <p className="text-muted-foreground text-sm">
                    {t('chat.threadChangeAcceptDisclosure')}
                  </p>
                  {!revisionSource ? (
                    <p role="alert">{t('chat.threadChangeAcceptUnavailable')}</p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`thread-change-revision-${request.id}`}
                      className="text-sm font-medium"
                    >
                      {t('chat.threadRevisionContent')}
                    </label>
                    <Textarea
                      id={`thread-change-revision-${request.id}`}
                      required
                      maxLength={100000}
                      value={form.revisionMarkdown}
                      onChange={(event) => form.setRevisionMarkdown(event.target.value)}
                      disabled={resolve.isPending || !revisionSource}
                    />
                  </div>
                  {!form.revisionChanged ? (
                    <p className="text-muted-foreground text-sm">
                      {t('chat.threadChangeRevisionUnchanged')}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`thread-change-cap-${request.id}`}
                      className="text-sm font-medium"
                    >
                      {t('chat.threadRevisionCap')}
                    </label>
                    <Input
                      id={`thread-change-cap-${request.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.spendCapUsd}
                      onChange={(event) => form.setSpendCapUsd(event.target.value)}
                      disabled={resolve.isPending || !revisionSource}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="submit"
                      disabled={resolve.isPending || !revisionSource || !form.revisionChanged}
                      isLoading={resolve.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                      {t('chat.threadSubmitChangeDecision')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelAcceptance}
                      disabled={resolve.isPending}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    onClick={() => beginAcceptance(request.id)}
                    disabled={!revisionSource || resolve.isPending}
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
                    {t('chat.threadChangeReject')}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </article>
      ))}
    </section>
  );
}
