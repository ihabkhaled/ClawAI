import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { MAX_PARALLEL_MODELS, MIN_PARALLEL_MODELS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ParallelRequest, ParallelResponse } from '@/types';
import { logger, showToast } from '@/utilities';

export function useInThreadCompare(threadId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Array<{ provider: string; model: string }>>(
    [],
  );
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ParallelRequest) => {
      logger.info({
        component: 'in-thread-compare',
        action: 'compare-start',
        message: 'Starting in-thread compare',
      });
      return chatRepository.sendParallel(data);
    },
    onSuccess: async () => {
      showToast.success({
        title: t('compare.title'),
        description: 'Models are processing. Results will appear below.',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'in-thread-compare',
        action: 'compare-error',
        message: error.message,
      });
      showToast.apiError(error, t('compare.compareFailed'));
    },
  });

  const toggleOpen = useCallback(() => setIsOpen((v) => !v), []);

  const handleToggleModel = useCallback((provider: string, model: string, checked: boolean) => {
    setSelectedModels((prev) => {
      if (checked) {
        return prev.length >= MAX_PARALLEL_MODELS ? prev : [...prev, { provider, model }];
      }
      return prev.filter((m) => m.provider !== provider || m.model !== model);
    });
  }, []);

  const canSend = selectedModels.length >= MIN_PARALLEL_MODELS && !mutation.isPending;

  const handleCompare = useCallback(
    (prompt: string) => {
      if (!canSend || prompt.trim().length === 0) {
        return;
      }
      mutation.mutate({ threadId, content: prompt.trim(), models: selectedModels });
    },
    [canSend, mutation, threadId, selectedModels],
  );

  return {
    isOpen,
    toggleOpen,
    selectedModels,
    handleToggleModel,
    handleCompare,
    result: mutation.data as ParallelResponse | undefined,
    isPending: mutation.isPending,
    isError: mutation.isError,
    canSend,
  };
}
