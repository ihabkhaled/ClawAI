import { ThreadPublicationType as ThreadPublicationTypeEnum } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { HTTP_STATUS_FORBIDDEN } from '@/constants/http-status.constants';
import { THREAD_GENERATION_MODEL_COUNT } from '@/constants/thread-publication.constants';
import type { Locale } from '@/enums/locale.enum';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useThreads } from '@/hooks/chat/use-threads';
import { useLocale } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { ModelSelection, ThreadPublicationType } from '@/types';
import type {
  ThreadGenerationFormController,
  ThreadGenerationFormOptions,
} from '@/types/thread-publication.types';
import { createThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';
import {
  isThreadModelGroupKey,
  pickDistinctModels,
} from '@/utilities/thread-model-defaults.utility';

/**
 * State and submit for "create a public Thread", shared by the owner portal and
 * the chat-header modal so the two can never drift apart (consent, spend cap,
 * model roles). The source chat is fixed when the modal opens it from a chat.
 */
export function useThreadGenerationForm({
  fixedSourceThreadId,
  defaultTopic,
  onStarted,
}: ThreadGenerationFormOptions): ThreadGenerationFormController {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { threads, isLoading: isLoadingThreads } = useThreads();
  const { groupedModels, isLoading: isLoadingModels } = useAvailableModels();
  const availableModels = useMemo(
    () =>
      groupedModels
        .filter(({ provider }) => isThreadModelGroupKey(provider))
        .flatMap(({ models }) => models),
    [groupedModels],
  );
  const [pickedSourceThreadId, setPickedSourceThreadId] = useState('');
  const [topic, setTopic] = useState(defaultTopic ?? '');
  const [publicationType, setPublicationType] = useState<ThreadPublicationType>(
    ThreadPublicationTypeEnum.ARTICLE,
  );
  const [contentLocale, setContentLocale] = useState<Locale>(locale);
  const [spendCapUsd, setSpendCapUsd] = useState('');
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);
  const [hasAcknowledgedPublic, setHasAcknowledgedPublic] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const sourceThreadId = fixedSourceThreadId ?? pickedSourceThreadId;

  const start = useMutation({
    mutationFn: (request: ReturnType<typeof createThreadGenerationRequest>) =>
      threadPublicationsRepository.startGeneration(request),
    onSuccess: async ({ publicationId }) => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      onStarted(publicationId);
    },
  });

  // 403: the plan or role does not include Thread generation (research, Judge and Critic).
  const isPlanBlocked =
    start.error instanceof ApiClientError && start.error.status === HTTP_STATUS_FORBIDDEN;

  useEffect(() => {
    if (selectedModels.length === 0 && availableModels.length > 0) {
      setSelectedModels(pickDistinctModels(availableModels, THREAD_GENERATION_MODEL_COUNT));
    }
  }, [availableModels, selectedModels.length]);

  function changeModel(index: number, selected: ModelSelection): void {
    setSelectedModels((current) =>
      current.map((entry, roleIndex) => (roleIndex === index ? selected : entry)),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!sourceThreadId || !hasAcknowledgedPublic) {
      return;
    }
    try {
      const request = createThreadGenerationRequest({
        sourceThreadId,
        topic,
        publicationType,
        contentLocale,
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

  return {
    threads,
    isLoadingThreads,
    isLoadingModels,
    availableModels,
    fixedSourceThreadId: fixedSourceThreadId ?? null,
    sourceThreadId,
    setSourceThreadId: setPickedSourceThreadId,
    topic,
    setTopic,
    publicationType,
    setPublicationType,
    contentLocale,
    setContentLocale,
    spendCapUsd,
    setSpendCapUsd,
    selectedModels,
    changeModel,
    hasAcknowledgedPublic,
    setHasAcknowledgedPublic,
    hasError: (start.isError && !isPlanBlocked) || requestError,
    isPlanBlocked,
    isStarting: start.isPending,
    submit,
  };
}
