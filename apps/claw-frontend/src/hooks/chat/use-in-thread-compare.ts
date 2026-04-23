import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { MAX_PARALLEL_MODELS, MIN_PARALLEL_MODELS } from '@/constants';
import { useJudgeModelOptions } from '@/hooks/chat/use-judge-model-options';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  ParallelModelTarget,
  ParallelRequest,
  ParallelResponse,
  UseInThreadCompareParams,
  UseInThreadCompareReturn,
} from '@/types';
import { logger, showToast } from '@/utilities';

export function useInThreadCompare({
  threadId,
  initialJudgeEnabled = false,
  initialJudgeModel = null,
}: UseInThreadCompareParams): UseInThreadCompareReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<ParallelModelTarget[]>([]);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { options: judgeModelOptions, isLoading: isJudgeModelOptionsLoading } =
    useJudgeModelOptions();
  const [judgeEnabled, setJudgeEnabled] = useState(initialJudgeEnabled);
  const [judgeModel, setJudgeModel] = useState<string | null>(initialJudgeModel);

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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messagesInfinite(threadId),
      });
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
  useEffect(() => {
    setJudgeEnabled(initialJudgeEnabled);
    setJudgeModel(initialJudgeModel);
  }, [initialJudgeEnabled, initialJudgeModel]);

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
      mutation.mutate({
        threadId,
        content: prompt.trim(),
        models: selectedModels,
        judgeEnabled,
        judgeModel,
      });
    },
    [canSend, mutation, threadId, selectedModels, judgeEnabled, judgeModel],
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
    judgeEnabled,
    setJudgeEnabled,
    judgeModel,
    setJudgeModel,
    judgeModelOptions,
    isJudgeModelOptionsLoading,
  };
}
