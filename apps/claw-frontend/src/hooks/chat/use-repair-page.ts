import { useCallback, useEffect, useState } from 'react';

import { REPAIR_CONTENT_MIN_LENGTH } from '@/constants';
import type { RepairType } from '@/enums/repair-type.enum';
import { useOrchestrationStages } from '@/hooks/chat/use-orchestration-stages';
import { useRepairPoll } from '@/hooks/chat/use-repair-poll';
import { useSendRepair } from '@/hooks/chat/use-send-repair';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseRepairPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useRepairPage(): UseRepairPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [selectedRepairTypes, setSelectedRepairTypes] = useState<RepairType[]>([]);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendRepair();

  const threadId = result?.threadId ?? null;
  const { repairMessage, isPolling, isRepairReady, isRepairError, handleViewInThread } =
    useRepairPoll(threadId);

  // Subscribe to the chat-service rich-progress SSE channel for the
  // current run. The shared hook does the SSE plumbing — we only own
  // the lifecycle gate (`isPending || isPolling`) so the connection
  // auto-closes once the repair lane finishes.
  const isRunActive = (isPending || isPolling) && !isRepairReady && !isRepairError;
  const { stages, reset: resetStages } = useOrchestrationStages(threadId, isRunActive);

  // When the host page kicks off a new run (a new threadId arrives),
  // make sure any residual stages from the previous run are cleared.
  useEffect(() => {
    if (threadId === null) {
      resetStages();
    }
  }, [threadId, resetStages]);

  const handleToggleRepairType = useCallback((type: RepairType): void => {
    setSelectedRepairTypes((previous) => {
      if (previous.includes(type)) {
        return previous.filter((value) => value !== type);
      }
      return [...previous, type];
    });
  }, []);

  const canSend =
    content.trim().length >= REPAIR_CONTENT_MIN_LENGTH &&
    selectedRepairTypes.length > 0 &&
    !isPending &&
    !isPolling;

  const canSubmit = canSend && selectedModel !== null;

  const handleSend = useCallback((): void => {
    if (!canSubmit) {
      return;
    }
    resetStages();
    send({
      content: content.trim(),
      repairTypes: selectedRepairTypes,
      targetProvider: selectedModel?.provider,
      targetModel: selectedModel?.model,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSubmit, send, resetStages, content, selectedRepairTypes, selectedModel]);

  const hasProgress = stages.length > 0;
  const isAnyError = isError || isRepairError;
  const errorMessage = isAnyError ? t('repair.sendFailed') : null;

  return {
    t,
    content,
    setContent,
    selectedRepairTypes,
    handleToggleRepairType,
    selectedModel,
    setSelectedModel,
    handleSend,
    isPending,
    isError,
    isRepairError,
    canSend,
    canSubmit,
    repairMessage,
    isPolling,
    isRepairReady,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  };
}
