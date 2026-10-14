import { ThreadPublicationType as ThreadPublicationTypeEnum } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { HTTP_STATUS_FORBIDDEN } from '@/constants/http-status.constants';
import { THREAD_GENERATION_MODEL_COUNT } from '@/constants/thread-publication.constants';
import type { Locale } from '@/enums/locale.enum';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useThreads } from '@/hooks/chat/use-threads';
import { useThreadRecommendedTeam } from '@/hooks/threads/use-thread-recommended-team';
import { useLocale } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { ModelSelection, ThreadPublicationType } from '@/types';
import type {
  ThreadGenerationFormController,
  ThreadGenerationFormOptions,
} from '@/types/thread-publication.types';
import {
  isThreadStartRefusal,
  resolveThreadErrorMessage,
} from '@/utilities/thread-error-message.utility';
import { createThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';
import {
  isThreadModelGroupKey,
  pickDistinctModels,
  rankThreadModels,
} from '@/utilities/thread-model-defaults.utility';
import {
  isRecommendedSelection,
  teamToSelections,
  toAvailabilityIndex,
  usableModels,
  withSeatFallbacks,
} from '@/utilities/thread-recommended-team.utility';
import { isThreadTopicLongEnough } from '@/utilities/thread-topic-length.utility';

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
  const { recommendation, isLoading: isLoadingTeam } = useThreadRecommendedTeam();
  const modelAvailability = useMemo(() => toAvailabilityIndex(recommendation), [recommendation]);
  const usablePool = useMemo(
    () => rankThreadModels(usableModels(availableModels, modelAvailability)),
    [availableModels, modelAvailability],
  );
  const recommendedTeam = recommendation?.team ?? null;
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
  const topicLongEnough = isThreadTopicLongEnough(topic);

  const start = useMutation({
    mutationFn: (request: ReturnType<typeof createThreadGenerationRequest>) =>
      threadPublicationsRepository.startGeneration(request),
    onSuccess: async ({ publicationId }) => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      onStarted(publicationId);
    },
  });

  // 403: the plan or role does not include Thread generation (research, Judge and Critic).
  // A refusal with a known code (ADR-174) shows its own sentence instead of this generic block.
  const isPlanBlocked =
    start.error instanceof ApiClientError &&
    start.error.status === HTTP_STATUS_FORBIDDEN &&
    !isThreadStartRefusal(start.error);

  // The server's recommended team is the default. Without it (the read failed, or no seat is in
  // the picker list) the wizard ranks the models the service called usable, never a refused one.
  const defaultSelection = useMemo(
    () =>
      teamToSelections(recommendedTeam, availableModels) ??
      pickDistinctModels(
        usablePool.length > 0 ? usablePool : availableModels,
        THREAD_GENERATION_MODEL_COUNT,
      ),
    [recommendedTeam, availableModels, usablePool],
  );

  useEffect(() => {
    if (selectedModels.length === 0 && defaultSelection.length > 0 && !isLoadingTeam) {
      setSelectedModels(defaultSelection);
    }
  }, [defaultSelection, selectedModels.length, isLoadingTeam]);

  function resetToRecommended(): void {
    setSelectedModels(defaultSelection);
  }

  function changeModel(index: number, selected: ModelSelection): void {
    setSelectedModels((current) =>
      current.map((entry, roleIndex) => (roleIndex === index ? selected : entry)),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!sourceThreadId || !hasAcknowledgedPublic || !topicLongEnough) {
      return;
    }
    try {
      const baseRequest = createThreadGenerationRequest({
        sourceThreadId,
        topic,
        publicationType,
        contentLocale,
        spendCapUsd: Number(spendCapUsd),
        models: selectedModels,
        fallbackPool: usablePool,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      });
      const request = withSeatFallbacks(baseRequest, selectedModels, recommendedTeam, usablePool);
      setRequestError(false);
      start.mutate(request);
    } catch {
      setRequestError(true);
    }
  }

  return {
    threads,
    isLoadingThreads,
    isLoadingModels: isLoadingModels || isLoadingTeam,
    availableModels,
    fixedSourceThreadId: fixedSourceThreadId ?? null,
    sourceThreadId,
    setSourceThreadId: setPickedSourceThreadId,
    topic,
    setTopic,
    isTopicLongEnough: topicLongEnough,
    isTopicTooShort: topic.trim().length > 0 && !topicLongEnough,
    publicationType,
    setPublicationType,
    contentLocale,
    setContentLocale,
    spendCapUsd,
    setSpendCapUsd,
    selectedModels,
    changeModel,
    modelAvailability,
    planName: recommendation?.planName ?? '',
    hasRecommendedTeam: recommendedTeam !== null,
    isRecommendedSelected: isRecommendedSelection(recommendedTeam, selectedModels),
    resetToRecommended,
    hasAcknowledgedPublic,
    setHasAcknowledgedPublic,
    hasError: requestError,
    startError: start.isError && !isPlanBlocked ? resolveThreadErrorMessage(start.error) : null,
    isPlanBlocked,
    isStarting: start.isPending,
    submit,
  };
}
