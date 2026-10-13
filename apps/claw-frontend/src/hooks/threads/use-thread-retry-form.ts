import type { ThreadGenerationProgress } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
        }),
      );
    },
    onSuccess: async () => {
      setIsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', publicationId] });
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });

  function open(): void {
    mutation.reset();
    setTopic(progress?.selections.topic ?? '');
    setSpendCapUsd(microUsdToInputValue(progress?.selections.spendCapMicroUsd ?? ''));
    setRoles(toThreadRetryRoleSelections(progress));
    setIsOpen(true);
  }

  function changeModel(roleId: string, model: ModelSelection): void {
    setRoles((current) =>
      current.map((entry) => (entry.roleId === roleId ? { ...entry, model } : entry)),
    );
  }

  return {
    isOpen,
    open,
    close: () => setIsOpen(false),
    topic,
    setTopic,
    spendCapUsd,
    setSpendCapUsd,
    roles,
    changeModel,
    submit: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    error: mutation.isError ? resolveThreadErrorMessage(mutation.error) : null,
  };
}
