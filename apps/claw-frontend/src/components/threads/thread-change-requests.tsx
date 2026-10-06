'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { useTranslation } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadChangeRequestsProps } from '@/types/thread-publication.types';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

export function ThreadChangeRequests({
  publicationId,
  revisionSource,
  onRevisionStarted,
}: ThreadChangeRequestsProps): ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [acceptingRequestId, setAcceptingRequestId] = useState('');
  const [revisionMarkdown, setRevisionMarkdown] = useState('');
  const [spendCapUsd, setSpendCapUsd] = useState('');
  const [ownerResponses, setOwnerResponses] = useState<Record<string, string>>({});
  const requests = useQuery({
    queryKey: ['thread-publications', publicationId, 'change-requests'],
    queryFn: () => threadPublicationsRepository.listChangeRequests(publicationId),
    enabled: publicationId !== '',
  });
  const revisionChanged =
    revisionSource !== null && revisionMarkdown.trim() !== revisionSource.markdown.trim();
  const resolve = useMutation({
    mutationFn: ({
      requestId,
      status,
      ownerResponse,
    }: {
      requestId: string;
      status:
        | ThreadPublicationChangeRequestStatus.Accepted
        | ThreadPublicationChangeRequestStatus.Rejected;
      ownerResponse: string;
    }) => {
      const response = ownerResponse.trim();
      const responseField = response === '' ? {} : { ownerResponse: response };
      if (status === ThreadPublicationChangeRequestStatus.Rejected) {
        return threadPublicationsRepository.resolveChangeRequest(publicationId, requestId, {
          status,
          ...responseField,
        });
      }
      if (!revisionSource) {
        throw new Error('Revision source unavailable');
      }
      const revision = createThreadRevisionRequest({
        markdown: revisionMarkdown,
        citations: revisionSource.citations,
        spendCapUsd: Number(spendCapUsd),
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      });
      return threadPublicationsRepository.resolveChangeRequest(publicationId, requestId, {
        status,
        ...responseField,
        revision,
      });
    },
    onSuccess: async ({ edit }, { requestId }) => {
      if (edit) {
        onRevisionStarted(edit.revisionId);
      }
      setAcceptingRequestId('');
      setOwnerResponses((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      setSpendCapUsd('');
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', publicationId, 'change-requests'],
      });
    },
  });

  function beginAcceptance(requestId: string): void {
    setAcceptingRequestId(requestId);
    setRevisionMarkdown(revisionSource?.markdown ?? '');
    setSpendCapUsd('');
    resolve.reset();
  }

  function cancelAcceptance(): void {
    setAcceptingRequestId('');
    setSpendCapUsd('');
    resolve.reset();
  }

  return (
    <section
      aria-labelledby="thread-change-requests-title"
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5"
    >
      <h2 id="thread-change-requests-title" className="text-lg font-semibold">
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
          className="border-border flex flex-col gap-3 rounded-md border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{request.suggestion}</p>
            <span className="text-muted-foreground text-sm">
              {t(`threadChangeRequest${request.status}`)}
            </span>
          </div>
          {request.ownerResponse ? (
            <p className="text-muted-foreground text-sm">{request.ownerResponse}</p>
          ) : null}
          {request.status === ThreadPublicationChangeRequestStatus.Pending ? (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor={`thread-response-${request.id}`}>
                  {t('chat.threadResponseToRequester')}
                </label>
                <Textarea
                  id={`thread-response-${request.id}`}
                  maxLength={2000}
                  value={ownerResponses[request.id] ?? ''}
                  onChange={(event) =>
                    setOwnerResponses((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                  disabled={resolve.isPending}
                />
              </div>
              {acceptingRequestId === request.id ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    resolve.mutate({
                      requestId: request.id,
                      status: ThreadPublicationChangeRequestStatus.Accepted,
                      ownerResponse: ownerResponses[request.id] ?? '',
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
                    <label htmlFor={`thread-change-revision-${request.id}`}>
                      {t('chat.threadRevisionContent')}
                    </label>
                    <Textarea
                      id={`thread-change-revision-${request.id}`}
                      required
                      maxLength={100000}
                      value={revisionMarkdown}
                      onChange={(event) => setRevisionMarkdown(event.target.value)}
                      disabled={resolve.isPending || !revisionSource}
                    />
                  </div>
                  {!revisionChanged ? (
                    <p className="text-muted-foreground text-sm">
                      {t('chat.threadChangeRevisionUnchanged')}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`thread-change-cap-${request.id}`}>
                      {t('chat.threadRevisionCap')}
                    </label>
                    <Input
                      id={`thread-change-cap-${request.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={spendCapUsd}
                      onChange={(event) => setSpendCapUsd(event.target.value)}
                      disabled={resolve.isPending || !revisionSource}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={resolve.isPending || !revisionSource || !revisionChanged}
                      isLoading={resolve.isPending}
                    >
                      {t('chat.threadSubmitChangeDecision')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelAcceptance}
                      disabled={resolve.isPending}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => beginAcceptance(request.id)}
                    disabled={!revisionSource || resolve.isPending}
                  >
                    {t('chat.threadChangeAccept')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      resolve.mutate({
                        requestId: request.id,
                        status: ThreadPublicationChangeRequestStatus.Rejected,
                        ownerResponse: ownerResponses[request.id] ?? '',
                      })
                    }
                    disabled={resolve.isPending}
                    isLoading={resolve.isPending}
                  >
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
