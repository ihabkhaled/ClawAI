import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { promptTemplatesRepository } from '@/repositories/prompt-templates/prompt-templates.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreatePromptTemplateInput, UpdatePromptTemplateVariables } from '@/types';
import { showToast } from '@/utilities/toast.utility';

/**
 * Create / update / delete / mark-used for prompt templates.
 *
 * Every one invalidates the `promptTemplates.all` PREFIX, not a single list key:
 * the list key embeds the active filters, so invalidating one exact key would
 * leave every other filter combination stale.
 */
export function usePromptTemplateMutations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.promptTemplates.all });

  const createMutation = useMutation({
    mutationFn: (input: CreatePromptTemplateInput) => promptTemplatesRepository.create(input),
    onSuccess: invalidate,
    onError: (error: unknown) => showToast.apiError(error, t('promptLibrary.saveFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: UpdatePromptTemplateVariables) =>
      promptTemplatesRepository.update(id, input),
    onSuccess: invalidate,
    onError: (error: unknown) => showToast.apiError(error, t('promptLibrary.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promptTemplatesRepository.remove(id),
    onSuccess: invalidate,
    onError: (error: unknown) => showToast.apiError(error, t('promptLibrary.deleteFailed')),
  });

  // Usage stats are best-effort: a failure must never block inserting the text.
  const markUsedMutation = useMutation({
    mutationFn: (id: string) => promptTemplatesRepository.markUsed(id),
    onSuccess: invalidate,
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    markUsed: markUsedMutation,
  };
}
