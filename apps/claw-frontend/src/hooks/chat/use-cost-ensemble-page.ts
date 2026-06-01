import { useCallback, useState } from 'react';

import { COST_ENSEMBLE_CONTENT_MIN_LENGTH } from '@/constants';
import { useCostEnsemblePoll } from '@/hooks/chat/use-cost-ensemble-poll';
import { useOrchestrationStages } from '@/hooks/chat/use-orchestration-stages';
import { useSendCostEnsemble } from '@/hooks/chat/use-send-cost-ensemble';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseCostEnsemblePageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useCostEnsemblePage(): UseCostEnsemblePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendCostEnsemble();

  const threadId = result?.threadId ?? null;
  const {
    costEnsembleResult,
    isPolling,
    isCostEnsembleReady,
    isCostEnsembleError,
    handleViewInThread,
  } = useCostEnsemblePoll(threadId);

  // The SSE stream is only useful while the request is in-flight or still
  // streaming sub-stages. We turn it off as soon as the result lands or
  // the run fails so the connection drops cleanly.
  const isRunning = isPending || (isPolling && !isCostEnsembleReady && !isCostEnsembleError);
  const { stages } = useOrchestrationStages(threadId, isRunning);

  const trimmedContent = content.trim();
  const meetsMinLength = trimmedContent.length >= COST_ENSEMBLE_CONTENT_MIN_LENGTH;
  const hasSelectedModel = selectedModel !== null;
  // `canSend` is the legacy/internal gate used by handleSend itself. The
  // shell uses `canSubmit` and adds its own `isPending` check.
  const canSend = meetsMinLength && hasSelectedModel && !isPending && !isPolling;
  const canSubmit = meetsMinLength && hasSelectedModel;
  const hasProgress = stages.length > 0;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({ content: trimmedContent, ...buildAdvancedModelSelectionPayload(selectedModel) });
  }, [canSend, send, trimmedContent, selectedModel]);

  return {
    t,
    content,
    setContent,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    costEnsembleResult,
    isPolling,
    isCostEnsembleReady,
    isCostEnsembleError,
    handleViewInThread,
    stages,
    hasProgress,
    isRunning,
  };
}
