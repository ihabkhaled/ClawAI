import { ThreadFailureClass, type ThreadGenerationProgress } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ModelSelection } from '@/types/component.types';
import type {
  ThreadRetryFormController,
  ThreadRetryRoleSelection,
} from '@/types/thread-generation-progress.types';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';
import {
  buildThreadRetryRequest,
  microUsdToInputValue,
  toThreadRetryRoleSelections,
} from '@/utilities/thread-generation-progress.utility';
import { isThreadTopicLongEnough } from '@/utilities/thread-topic-length.utility';

/**
 * The owner's "retry with changes" form: topic, spend cap and a model per role,
 * pre-filled from what the failed job used. Submit starts a new job from the
 * same snapshot with a fresh idempotency key.
 */
export function useThreadRetryForm(
  publicationId: string,
  progress: ThreadGenerationProgress | undefined,
): ThreadRetryFormController {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [spendCapUsd, setSpendCapUsd] = useState('');
  const [roles, setRoles] = useState<ThreadRetryRoleSelection[]>([]);
  const [refreshResearch, setRefreshResearch] = useState(false);
  const [showNarrowHint, setShowNarrowHint] = useState(false);
  const topicRef = useRef<HTMLTextAreaElement | null>(null);
  const topicLongEnough = isThreadTopicLongEnough(topic);
  const mutation = useMutation({
    mutationFn: () => {
      if (!progress) {
        throw new Error('The failed generation is not loaded yet');
      }
      return threadPublicationsRepository.retryGeneration(
        publicationId,
        buildThreadRetryRequest({
          progress,
          idempotencyKey: crypto.randomUUID(),
          topic,
          spendCapUsd,
          roles,
          refreshResearch,
        }),
      );
    },
    onSuccess: async () => {
      setIsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', publicationId] });
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });

  function open(narrow = false): void {
    mutation.reset();
    setTopic(progress?.selections.topic ?? '');
    setSpendCapUsd(microUsdToInputValue(progress?.selections.spendCapMicroUsd ?? ''));
    setRoles(toThreadRetryRoleSelections(progress));
    // A review that failed only for lack of sources asks for a fresh research pass by default.
    // Narrowing the claims removes the need for sources, so it does not.
    setRefreshResearch(
      !narrow && progress?.failure?.failureClass === ThreadFailureClass.EVIDENCE_GAP,
    );
    setShowNarrowHint(narrow);
    setIsOpen(true);
  }

  function onOpenAutoFocus(event: Event): void {
    if (showNarrowHint) {
      event.preventDefault();
      topicRef.current?.focus();
    }
  }

  function changeModel(roleId: string, model: ModelSelection): void {
    setRoles((current) =>
      current.map((entry) => (entry.roleId === roleId ? { ...entry, model } : entry)),
    );
  }

  return {
    isOpen,
    open: () => open(false),
    openNarrow: () => open(true),
    showNarrowHint,
    topicRef,
    onOpenAutoFocus,
    refreshResearch,
    setRefreshResearch,
    close: () => setIsOpen(false),
    topic,
    setTopic,
    isTopicLongEnough: topicLongEnough,
    isTopicTooShort: topic.trim().length > 0 && !topicLongEnough,
    spendCapUsd,
    setSpendCapUsd,
    roles,
    changeModel,
    submit: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    error: mutation.isError ? resolveThreadErrorMessage(mutation.error) : null,
  };
}
