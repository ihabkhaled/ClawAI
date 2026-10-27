import { ThreadFailureClass, type ThreadGenerationProgress } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ModelSelection } from '@/types/component.types';
import type {
  ThreadRetryFormController,
  ThreadRetryRoleSelection,
} from '@/types/thread-generation-progress.types';
import { normalizeAcceptedGaps, threadGapChoices } from '@/utilities/thread-accepted-gaps.utility';
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
  const [showGapPicker, setShowGapPicker] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const topicRef = useRef<HTMLTextAreaElement | null>(null);
  const topicLongEnough = isThreadTopicLongEnough(topic);
  const gapChoices = threadGapChoices(progress);
  // Only gaps the failed review listed can be accepted, whatever was ticked earlier.
  const acceptedGaps = showGapPicker
    ? normalizeAcceptedGaps(ticked.filter((text) => gapChoices.includes(text)))
    : [];
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
          acceptedEvidenceGaps: acceptedGaps,
        }),
      );
    },
    onSuccess: async () => {
      setIsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', publicationId] });
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });

  function open(narrow = false, acceptGaps = false): void {
    mutation.reset();
    setTopic(progress?.selections.topic ?? '');
    setSpendCapUsd(microUsdToInputValue(progress?.selections.spendCapMicroUsd ?? ''));
    setRoles(toThreadRetryRoleSelections(progress));
    // A review that failed only for lack of sources asks for a fresh research pass by default.
    // Narrowing the claims removes the need for sources, so it does not.
    // Accepting the gaps means writing without more sources, so it does not ask for research.
    setRefreshResearch(
      !narrow && !acceptGaps && progress?.failure?.failureClass === ThreadFailureClass.EVIDENCE_GAP,
    );
    setShowNarrowHint(narrow);
    setShowGapPicker(acceptGaps);
    setTicked([]);
    setIsOpen(true);
  }

  function onOpenAutoFocus(event: Event): void {
    if (showNarrowHint) {
      event.preventDefault();
      topicRef.current?.focus();
    }
  }

  function toggleGap(text: string, accepted: boolean): void {
    setTicked((current) =>
      accepted
        ? [...current.filter((item) => item !== text), text]
        : current.filter((item) => item !== text),
    );
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
    openAcceptGaps: () => open(false, true),
    showGapPicker,
    gapChoices,
    acceptedGaps,
    toggleGap,
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
