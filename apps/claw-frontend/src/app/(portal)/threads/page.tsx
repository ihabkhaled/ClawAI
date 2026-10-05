'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { THREAD_PUBLICATION_OPTIONS } from '@/constants/thread-publication.constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useThreads } from '@/hooks/chat/use-threads';
import { useThreadPublications } from '@/hooks/threads/use-thread-publications';
import { useTranslation } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ModelSelection, ThreadPublicationType } from '@/types';
import { createThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';

export default function ThreadPublicationsPage(): ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: publications = [], isLoading, isError } = useThreadPublications();
  const { threads, isLoading: isLoadingThreads } = useThreads();
  const { groupedModels, isLoading: isLoadingModels } = useAvailableModels();
  const availableModels = useMemo(
    () =>
      groupedModels
        .filter(({ provider }) => !provider.startsWith('IMAGE_'))
        .flatMap(({ models }) => models),
    [groupedModels],
  );
  const [sourceThreadId, setSourceThreadId] = useState('');
  const [topic, setTopic] = useState('');
  const [publicationType, setPublicationType] = useState<ThreadPublicationType>('article');
  const [spendCapUsd, setSpendCapUsd] = useState('');
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);
  const [activePublicationId, setActivePublicationId] = useState('');
  const [requestError, setRequestError] = useState(false);
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
  const start = useMutation({
    mutationFn: (request: ReturnType<typeof createThreadGenerationRequest>) =>
      threadPublicationsRepository.startGeneration(request),
    onSuccess: async ({ publicationId }) => {
      setActivePublicationId(publicationId);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
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

  useEffect(() => {
    if (selectedModels.length === 0 && availableModels.length > 0) {
      const firstModel = availableModels[0];
      if (firstModel) {
        setSelectedModels(Array.from({ length: 5 }, () => firstModel));
      }
    }
  }, [availableModels, selectedModels.length]);

  const hasDraft = Boolean(generation.data?.draft);
  const generationFailed = generation.data?.status === 'FAILED';
  const generationCancelled = generation.data?.status === 'CANCELLED';
  const publicationReady = generation.data?.publicationStatus === 'READY_FOR_REVIEW';

  function submitGeneration(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!sourceThreadId) {
      return;
    }
    try {
      const request = createThreadGenerationRequest({
        sourceThreadId,
        topic,
        publicationType,
        spendCapUsd: Number(spendCapUsd),
        models: selectedModels,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      });
      setRequestError(false);
      start.mutate(request);
    } catch {
      setRequestError(true);
    }
  }

  function selectPublication(publicationId: string): void {
    cancel.reset();
    publish.reset();
    setActivePublicationId(publicationId);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t('threads')}</h1>
      <section
        className="border-border bg-card rounded-lg border p-5"
        aria-labelledby="threads-create-title"
      >
        <h2 id="threads-create-title" className="mb-4 text-lg font-semibold">
          {t('newThread')}
        </h2>
        <p className="bg-muted/30 mb-5 rounded-md p-3 text-sm" role="note">
          {t('threadPublicIntentDisclosure')}
        </p>
        <form className="flex flex-col gap-4" onSubmit={submitGeneration}>
          <label className="flex flex-col gap-1 text-sm">
            {t('threadSourceChat')}
            <select
              required
              value={sourceThreadId}
              onChange={(event) => setSourceThreadId(event.target.value)}
              className="border-input bg-background rounded-md border px-3 py-2"
            >
              <option value="">{isLoadingThreads ? t('loadingThreads') : t('noThreads')}</option>
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title ?? t('noThreads')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('threadTopic')}
            <textarea
              required
              minLength={10}
              maxLength={10000}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="border-input bg-background min-h-28 rounded-md border px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              {t('threadPublicationType')}
              <select
                value={publicationType}
                onChange={(event) =>
                  setPublicationType(event.target.value as ThreadPublicationType)
                }
                className="border-input bg-background rounded-md border px-3 py-2"
              >
                {THREAD_PUBLICATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.translationKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('threadSpendCapUsd')}
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={spendCapUsd}
                onChange={(event) => setSpendCapUsd(event.target.value)}
                className="border-input bg-background rounded-md border px-3 py-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {selectedModels.map((model, index) => {
              let roleLabel = t('threadCriticModel');
              if (index < 3) {
                roleLabel = `${t('threadAuthorModel')} ${index + 1}`;
              } else if (index === 3) {
                roleLabel = t('threadJudgeModel');
              }
              return (
                <label
                  className="flex flex-col gap-1 text-sm"
                  key={['author-1', 'author-2', 'author-3', 'judge', 'critic'][index]}
                >
                  {roleLabel}
                  <select
                    aria-label={roleLabel}
                    required
                    value={`${model.provider}/${model.model}`}
                    onChange={(event) => {
                      const selected = availableModels.find(
                        (entry) => `${entry.provider}/${entry.model}` === event.target.value,
                      );
                      if (selected) {
                        setSelectedModels((current) =>
                          current.map((entry, roleIndex) =>
                            roleIndex === index ? selected : entry,
                          ),
                        );
                      }
                    }}
                    className="border-input bg-background rounded-md border px-3 py-2"
                  >
                    {availableModels.map((entry) => (
                      <option
                        key={`${entry.provider}/${entry.model}`}
                        value={`${entry.provider}/${entry.model}`}
                      >
                        {entry.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          {start.isError || requestError ? <p role="alert">{t('threadCreateFailed')}</p> : null}
          <Button
            type="submit"
            disabled={start.isPending || isLoadingModels || availableModels.length === 0}
            className="w-fit"
            isLoading={start.isPending}
          >
            {start.isPending ? t('common.loading') : t('threadStartGeneration')}
          </Button>
        </form>
      </section>
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
              <Button
                type="button"
                variant="ghost"
                className="h-auto text-start"
                onClick={() => selectPublication(publication.id)}
              >
                <span className="block font-medium">{publication.title ?? t('noThreads')}</span>
                <time className="text-muted-foreground text-xs" dateTime={publication.updatedAt}>
                  {new Date(publication.updatedAt).toLocaleString()}
                </time>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {generation.isFetching ? <p role="status">{t('common.loading')}</p> : null}
      {generation.isError ? <p role="alert">{t('threadCreateFailed')}</p> : null}
      {generation.data ? (
        <section
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-5"
          aria-live="polite"
        >
          {hasDraft ? <h2 className="text-lg font-semibold">{t('threadDraftPreview')}</h2> : null}
          {generationFailed && !hasDraft ? <p role="alert">{t('threadCreateFailed')}</p> : null}
          {generationCancelled && !hasDraft ? (
            <p role="status">{t('threadGenerationCancelled')}</p>
          ) : null}
          {!generationFailed && !generationCancelled && !hasDraft ? (
            <p role="status">{t('common.loading')}</p>
          ) : null}
          {generation.data.draft ? (
            <>
              <h3 className="font-medium">{t('threadDraftPreview')}</h3>
              <pre className="bg-muted/30 max-h-[32rem] overflow-auto rounded-md p-4 text-sm whitespace-pre-wrap">
                {generation.data.draft.markdown}
              </pre>
              <h3 className="font-medium">{t('threadCitations')}</h3>
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
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          generation.data.draft &&
          !publicationReady ? (
            <p role="status">{t('threadDraftNotEligible')}</p>
          ) : null}
          {generation.data.status !== 'WAITING_FOR_REVIEW' &&
          generation.data.status !== 'FAILED' &&
          generation.data.status !== 'CANCELLED' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="w-fit"
              isLoading={cancel.isPending}
            >
              {t('common.cancel')}
            </Button>
          ) : null}
          {publish.isSuccess ? <p role="status">{t('threadPublished')}</p> : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          generation.data.draft &&
          publicationReady &&
          !publish.isSuccess ? (
            <Button
              type="button"
              onClick={() => publish.mutate()}
              disabled={publish.isSuccess}
              className="w-fit"
              isLoading={publish.isPending}
            >
              {t('threadApproveAndPublish')}
            </Button>
          ) : null}
          {publish.isError || cancel.isError ? <p role="alert">{t('threadCreateFailed')}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
