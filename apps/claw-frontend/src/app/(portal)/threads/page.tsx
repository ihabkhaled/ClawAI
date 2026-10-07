'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { ThreadChangeRequests } from '@/components/threads/thread-change-requests';
import { ThreadGenerationForm } from '@/components/threads/thread-generation-form';
import { Button } from '@/components/ui/button';
import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { useThreadGenerationForm } from '@/hooks/threads/use-thread-generation-form';
import { useThreadPublications } from '@/hooks/threads/use-thread-publications';
import { useTranslation } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

export default function ThreadPublicationsPage(): ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: publications = [], isLoading, isError } = useThreadPublications();
  const form = useThreadGenerationForm({ onStarted: handleStarted });
  const searchParams = useSearchParams();
  const [activePublicationId, setActivePublicationId] = useState(
    searchParams.get('publication') ?? '',
  );
  const [editingRevision, setEditingRevision] = useState(false);
  const [revisionMarkdown, setRevisionMarkdown] = useState('');
  const [revisionCapUsd, setRevisionCapUsd] = useState('');
  const [revisionRequestIds, setRevisionRequestIds] = useState({
    idempotencyKey: '',
    correlationId: '',
  });
  const [activeRevisionId, setActiveRevisionId] = useState('');
  const selectedPublication = publications.find(({ id }) => id === activePublicationId);
  const generation = useQuery({
    queryKey: ['thread-publications', activePublicationId, 'generation-state'],
    queryFn: () => threadPublicationsRepository.getGenerationState(activePublicationId),
    enabled: activePublicationId !== '',
    refetchInterval: (query) =>
      query.state.data?.status === 'WAITING_FOR_REVIEW' ||
      query.state.data?.status === 'FAILED' ||
      query.state.data?.status === 'CANCELLED'
        ? false
        : 3000,
  });
  const revisionReview = useQuery({
    queryKey: ['thread-publications', activePublicationId, 'revisions', activeRevisionId],
    queryFn: () =>
      threadPublicationsRepository.getRevisionReviewState(activePublicationId, activeRevisionId),
    enabled: activePublicationId !== '' && activeRevisionId !== '',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return query.state.data?.ready ||
        ['FAILED', 'CANCELLED', 'STALE', 'REVIEW_REQUIRED'].includes(status ?? '')
        ? false
        : 3000;
    },
  });
  const cancel = useMutation({
    mutationFn: () => threadPublicationsRepository.cancelGeneration(activePublicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', activePublicationId, 'generation-state'],
      });
    },
  });
  const publish = useMutation({
    mutationFn: () => threadPublicationsRepository.publish(activePublicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', activePublicationId, 'generation-state'],
      });
    },
  });
  const editRevision = useMutation({
    mutationFn: () => {
      const draft = generation.data?.draft;
      if (!draft) {
        throw new Error('The draft is unavailable');
      }
      const request = createThreadRevisionRequest({
        markdown: revisionMarkdown,
        citations: draft.citations,
        spendCapUsd: Number(revisionCapUsd),
        idempotencyKey: revisionRequestIds.idempotencyKey,
        correlationId: revisionRequestIds.correlationId,
      });
      return threadPublicationsRepository.editRevision(activePublicationId, request);
    },
    onSuccess: async ({ revisionId }) => {
      setActiveRevisionId(revisionId);
      setEditingRevision(false);
      setRevisionRequestIds({ idempotencyKey: '', correlationId: '' });
      publish.reset();
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });
  const unpublish = useMutation({
    mutationFn: () => threadPublicationsRepository.unpublish(activePublicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', activePublicationId, 'generation-state'],
      });
    },
  });
  const exportPublication = useMutation({
    mutationFn: (format: ThreadPublicationExportFormat) =>
      threadPublicationsRepository.export(activePublicationId, format),
    onSuccess: ({ format, content }) => {
      const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([body], {
        type:
          format === ThreadPublicationExportFormat.Markdown
            ? 'text/markdown;charset=utf-8'
            : 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `thread-publication.${format === ThreadPublicationExportFormat.Markdown ? 'md' : 'json'}`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const hasDraft = Boolean(generation.data?.draft);
  const generationFailed = generation.data?.status === 'FAILED';
  const generationCancelled = generation.data?.status === 'CANCELLED';
  const publicationReady = generation.data?.publicationStatus === 'READY_FOR_REVIEW';
  const revisionIsTerminal = Boolean(
    revisionReview.data?.ready ||
    ['FAILED', 'CANCELLED', 'STALE', 'REVIEW_REQUIRED'].includes(revisionReview.data?.status ?? ''),
  );

  function getRevisionReviewMessage(): string {
    const reviewStatus = revisionReview.data?.status;
    if (revisionReview.isPending) {
      return t('common.loading');
    }
    if (revisionReview.data?.ready) {
      return t('chat.threadRevisionReady');
    }
    if (['FAILED', 'CANCELLED', 'STALE', 'REVIEW_REQUIRED'].includes(reviewStatus ?? '')) {
      return t('chat.threadRevisionNeedsChanges');
    }
    return t('chat.threadRevisionPending');
  }

  function handleStarted(publicationId: string): void {
    publish.reset();
    cancel.reset();
    editRevision.reset();
    unpublish.reset();
    exportPublication.reset();
    setActiveRevisionId('');
    setEditingRevision(false);
    setActivePublicationId(publicationId);
  }

  function selectPublication(publicationId: string): void {
    cancel.reset();
    publish.reset();
    editRevision.reset();
    unpublish.reset();
    exportPublication.reset();
    queryClient.removeQueries({ queryKey: ['thread-publications', publicationId, 'revisions'] });
    setActiveRevisionId('');
    setEditingRevision(false);
    setActivePublicationId(publicationId);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t('chat.threads')}</h1>
      <section
        className="border-border bg-card rounded-lg border p-5"
        aria-labelledby="threads-create-title"
      >
        <h2 id="threads-create-title" className="mb-4 text-lg font-semibold">
          {t('chat.threadCreateTitle')}
        </h2>
        <ThreadGenerationForm form={form} />
      </section>
      {isLoading ? <p role="status">{t('chat.loadingThreads')}</p> : null}
      {isError ? <p role="alert">{t('chat.threadPublicationsLoadFailed')}</p> : null}
      {!isLoading && !isError && publications.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('chat.noThreads')}
        </p>
      ) : null}
      {publications.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {publications.map((publication) => (
            <li key={publication.id} className="border-border bg-card rounded-lg border p-4">
              <Button
                type="button"
                variant="ghost"
                className="h-auto text-start"
                onClick={() => selectPublication(publication.id)}
              >
                <span className="block font-medium">
                  {publication.title ?? t('chat.noThreads')}
                </span>
                <time className="text-muted-foreground text-xs" dateTime={publication.updatedAt}>
                  {new Date(publication.updatedAt).toLocaleString()}
                </time>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {generation.isFetching ? <p role="status">{t('common.loading')}</p> : null}
      {generation.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
      {generation.data ? (
        <section
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-5"
          aria-live="polite"
        >
          {hasDraft ? (
            <h2 className="text-lg font-semibold">{t('chat.threadDraftPreview')}</h2>
          ) : null}
          {generationFailed && !hasDraft ? (
            <p role="alert">{t('chat.threadCreateFailed')}</p>
          ) : null}
          {generationCancelled && !hasDraft ? (
            <p role="status">{t('chat.threadGenerationCancelled')}</p>
          ) : null}
          {cancel.isPending ? <p role="status">{t('chat.threadCancellationRequesting')}</p> : null}
          {cancel.isSuccess ? <p role="status">{t('chat.threadCancellationRequested')}</p> : null}
          {cancel.isError ? <p role="alert">{t('chat.threadCancellationFailed')}</p> : null}
          {!generationFailed && !generationCancelled && !hasDraft ? (
            <p role="status">{t('common.loading')}</p>
          ) : null}
          {generation.data.draft ? (
            <>
              <h3 className="font-medium">{t('chat.threadDraftPreview')}</h3>
              <pre className="bg-muted/30 max-h-[32rem] overflow-auto rounded-md p-4 text-sm whitespace-pre-wrap">
                {generation.data.draft.markdown}
              </pre>
              <h3 className="font-medium">{t('chat.threadCitations')}</h3>
              <ul className="list-inside list-disc">
                {generation.data.draft.citations.map(({ evidenceId, url }) => (
                  <li key={evidenceId}>
                    <a
                      className="text-primary underline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {generation.data.draft &&
          !editingRevision &&
          (!activeRevisionId || revisionIsTerminal || revisionReview.isError) ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => {
                editRevision.reset();
                setActiveRevisionId('');
                setRevisionMarkdown(generation.data?.draft?.markdown ?? '');
                setRevisionRequestIds({
                  idempotencyKey: crypto.randomUUID(),
                  correlationId: crypto.randomUUID(),
                });
                setEditingRevision(true);
              }}
            >
              {t('chat.threadEditDraft')}
            </Button>
          ) : null}
          {editingRevision ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                editRevision.mutate();
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                {t('chat.threadRevisionContent')}
                <textarea
                  required
                  maxLength={100000}
                  value={revisionMarkdown}
                  onChange={(event) => {
                    setRevisionMarkdown(event.target.value);
                    setRevisionRequestIds({
                      idempotencyKey: crypto.randomUUID(),
                      correlationId: crypto.randomUUID(),
                    });
                  }}
                  className="border-input bg-background min-h-64 rounded-md border px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('chat.threadRevisionCap')}
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={revisionCapUsd}
                  onChange={(event) => {
                    setRevisionCapUsd(event.target.value);
                    setRevisionRequestIds({
                      idempotencyKey: crypto.randomUUID(),
                      correlationId: crypto.randomUUID(),
                    });
                  }}
                  className="border-input bg-background rounded-md border px-3 py-2"
                />
              </label>
              <p className="text-muted-foreground text-sm">
                {t('chat.threadRevisionReviewDisclosure')}
              </p>
              {editRevision.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={editRevision.isPending}
                  isLoading={editRevision.isPending}
                >
                  {t('chat.threadSubmitRevision')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingRevision(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : null}
          {activeRevisionId ? (
            <p role="status">
              {t('chat.threadRevisionStatus')}: {getRevisionReviewMessage()}
            </p>
          ) : null}
          {revisionReview.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          generation.data.draft &&
          !publicationReady ? (
            <p role="status">{t('chat.threadDraftNotEligible')}</p>
          ) : null}
          {generation.data.status !== 'WAITING_FOR_REVIEW' &&
          generation.data.status !== 'FAILED' &&
          generation.data.status !== 'CANCELLED' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending || cancel.isSuccess}
              className="w-fit"
              isLoading={cancel.isPending}
            >
              {t('common.cancel')}
            </Button>
          ) : null}
          {publish.isSuccess ? <p role="status">{t('chat.threadPublished')}</p> : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          generation.data.draft &&
          (activeRevisionId ? revisionReview.data?.ready : publicationReady) &&
          !publish.isSuccess ? (
            <Button
              type="button"
              onClick={() => publish.mutate()}
              disabled={publish.isSuccess}
              className="w-fit"
              isLoading={publish.isPending}
            >
              {t('chat.threadApproveAndPublish')}
            </Button>
          ) : null}
          {selectedPublication?.status === 'PUBLISHED' && !unpublish.isSuccess ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => unpublish.mutate()}
              disabled={unpublish.isPending}
              isLoading={unpublish.isPending}
            >
              {t('chat.threadUnpublish')}
            </Button>
          ) : null}
          {selectedPublication ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => exportPublication.mutate(ThreadPublicationExportFormat.Markdown)}
                disabled={exportPublication.isPending}
              >
                {t('chat.threadExportMarkdown')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => exportPublication.mutate(ThreadPublicationExportFormat.Json)}
                disabled={exportPublication.isPending}
              >
                {t('chat.threadExportJson')}
              </Button>
            </div>
          ) : null}
          {unpublish.isSuccess ? <p role="status">{t('chat.threadUnpublished')}</p> : null}
          {unpublish.isError || exportPublication.isError ? (
            <p role="alert">{t('chat.threadCreateFailed')}</p>
          ) : null}
          {publish.isError || cancel.isError ? (
            <p role="alert">{t('chat.threadCreateFailed')}</p>
          ) : null}
          {selectedPublication?.status === 'PUBLISHED' ? (
            <ThreadChangeRequests
              publicationId={activePublicationId}
              revisionSource={generation.data.draft}
              onRevisionStarted={(revisionId) => {
                setActiveRevisionId(revisionId);
                publish.reset();
              }}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
