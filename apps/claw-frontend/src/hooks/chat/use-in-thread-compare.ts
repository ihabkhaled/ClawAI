import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { MAX_PARALLEL_MODELS, MIN_PARALLEL_MODELS } from '@/constants';
import { CompareResearchMode } from '@/enums';
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
  const [prompt, setPrompt] = useState('');
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { options: judgeModelOptions, isLoading: isJudgeModelOptionsLoading } =
    useJudgeModelOptions();
  const [judgeEnabled, setJudgeEnabled] = useState(initialJudgeEnabled);
  const [judgeModel, setJudgeModel] = useState<string | null>(initialJudgeModel);
  const [criticEnabled, setCriticEnabled] = useState(false);
  const [criticModel, setCriticModel] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState<CompareResearchMode>(CompareResearchMode.NONE);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

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
        description: t('compare.modelsProcessing'),
      });
      setSelectedFileIds([]);
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

  const toggleOpen = useCallback(() => {
    setIsOpen((v) => {
      // Reset file selection when closing the panel so a stale selection
      // doesn't survive the next open.
      if (v) {
        setSelectedFileIds([]);
      }
      return !v;
    });
  }, []);
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
    (promptValue: string) => {
      if (!canSend || promptValue.trim().length === 0) {
        return;
      }
      mutation.mutate({
        threadId,
        content: promptValue.trim(),
        models: selectedModels,
        judgeEnabled,
        judgeModel,
        ...(judgeEnabled && criticEnabled ? { criticEnabled: true, criticModel } : {}),
        ...(researchMode === CompareResearchMode.NONE ? {} : { researchMode }),
        ...(selectedFileIds.length > 0 ? { fileIds: selectedFileIds } : {}),
      });
    },
    [
      canSend,
      mutation,
      threadId,
      selectedModels,
      judgeEnabled,
      judgeModel,
      criticEnabled,
      criticModel,
      researchMode,
      selectedFileIds,
    ],
  );

  // Wrapper around handleCompare that uses the controlled prompt state. The
  // RichPromptTextarea's Enter handler + the Send button both call this so
  // there is a single source of truth for "send the current prompt".
  const handleSend = useCallback(() => {
    if (!canSend || prompt.trim().length === 0) {
      return;
    }
    handleCompare(prompt);
    setPrompt('');
  }, [canSend, prompt, handleCompare]);

  return {
    isOpen,
    toggleOpen,
    selectedModels,
    handleToggleModel,
    prompt,
    setPrompt,
    handleSend,
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
    criticEnabled,
    setCriticEnabled,
    criticModel,
    setCriticModel,
    researchMode,
    setResearchMode,
    selectedFileIds,
    setSelectedFileIds,
  };
}
