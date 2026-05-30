import { useCallback, useState } from 'react';

import { MIN_PARALLEL_MODELS, MAX_PARALLEL_MODELS } from '@/constants';
import { CompareResearchMode } from '@/enums';
import { useJudgeModelOptions } from '@/hooks/chat/use-judge-model-options';
import { useParallelCompare } from '@/hooks/chat/use-parallel-compare';
import { useParallelPoll } from '@/hooks/chat/use-parallel-poll';
import { useParallelStream } from '@/hooks/chat/use-parallel-stream';
import { useTranslation } from '@/lib/i18n';
import type { ParallelModelTarget, UseParallelComparePageReturn } from '@/types';

export function useParallelComparePage(): UseParallelComparePageReturn {
  const { t } = useTranslation();
  const { options: judgeModelOptions, isLoading: isJudgeModelOptionsLoading } =
    useJudgeModelOptions();
  const [selectedModels, setSelectedModels] = useState<ParallelModelTarget[]>([]);
  const [prompt, setPrompt] = useState('');
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState<CompareResearchMode>(CompareResearchMode.NONE);
  const { send, result, isPending, isError } = useParallelCompare();

  const threadId = result?.threadId ?? null;
  const { pollingMessages, isPolling, allResponded, handleViewInThread } = useParallelPoll(
    threadId,
    selectedModels.length,
  );
  const { lanes: laneStreams } = useParallelStream(threadId ?? undefined, isPending || isPolling);

  const selectionError =
    selectedModels.length > 0 && selectedModels.length < MIN_PARALLEL_MODELS
      ? t('compare.minModels', { min: MIN_PARALLEL_MODELS })
      : null;

  const canSend =
    selectedModels.length >= MIN_PARALLEL_MODELS &&
    selectedModels.length <= MAX_PARALLEL_MODELS &&
    prompt.trim().length > 0 &&
    !isPending &&
    !isPolling;

  const handleToggleModel = useCallback((provider: string, model: string, checked: boolean) => {
    setSelectedModels((prev) => {
      if (checked) {
        if (prev.length >= MAX_PARALLEL_MODELS) {
          return prev;
        }
        return [...prev, { provider, model }];
      }
      return prev.filter((m) => m.provider !== provider || m.model !== model);
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) {
      return;
    }
    send({
      content: prompt.trim(),
      models: selectedModels,
      judgeEnabled,
      judgeModel,
      // Only attach the field when the user picked a non-NONE mode so v1
      // server-side defaults stay the source of truth for the OFF path.
      ...(researchMode === CompareResearchMode.NONE ? {} : { researchMode }),
    });
  }, [canSend, send, prompt, selectedModels, judgeEnabled, judgeModel, researchMode]);

  return {
    t,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    result,
    isPending,
    isError,
    canSend,
    selectionError,
    pollingMessages,
    isPolling,
    allResponded,
    laneStreams,
    handleViewInThread,
    judgeEnabled,
    setJudgeEnabled,
    judgeModel,
    setJudgeModel,
    judgeModelOptions,
    isJudgeModelOptionsLoading,
    researchMode,
    setResearchMode,
  };
}
