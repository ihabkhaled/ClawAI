import { useCallback, useMemo, useState } from 'react';

import { DECOMPOSE_CONTENT_MIN_LENGTH, DECOMPOSE_DEFAULT_MAX_SUB_TASKS } from '@/constants';
import { useDecomposePoll } from '@/hooks/chat/use-decompose-poll';
import { useSendDecompose } from '@/hooks/chat/use-send-decompose';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseDecomposePageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload, buildDecomposeStages } from '@/utilities';

export function useDecomposePage(): UseDecomposePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [maxSubTasks, setMaxSubTasks] = useState(DECOMPOSE_DEFAULT_MAX_SUB_TASKS);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { send, result, isPending, isError } = useSendDecompose();

  const threadId = result?.threadId ?? null;
  const {
    decompositionResult,
    isPolling,
    isDecompositionReady,
    isDecompositionError,
    handleViewInThread,
  } = useDecomposePoll(threadId);

  // Legacy `canSend` gate stays in place for the in-place button label
  // logic. New `canSubmit` is the orchestration shell's gate: it requires
  // a selected model AND a non-empty prompt AND no in-flight run.
  const canSend = content.trim().length >= DECOMPOSE_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const canSubmit = canSend && selectedModel !== null;

  const handleSend = useCallback((): void => {
    if (!canSubmit) {
      return;
    }
    setHasSubmitted(true);
    send({
      content: content.trim(),
      maxSubTasks,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSubmit, send, content, maxSubTasks, selectedModel]);

  const isAnyError = isError || isDecompositionError;
  const errorMessage = isAnyError ? t('decompose.sendFailed') : null;

  const stages = useMemo(
    () =>
      buildDecomposeStages(
        {
          hasSubmitted,
          hasThreadId: threadId !== null,
          isPolling,
          isReady: isDecompositionReady,
          isError: isAnyError,
        },
        t,
      ),
    [hasSubmitted, threadId, isPolling, isDecompositionReady, isAnyError, t],
  );

  const hasProgress = stages.length > 0;

  return {
    t,
    content,
    setContent,
    maxSubTasks,
    setMaxSubTasks,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    decompositionResult,
    isPolling,
    isDecompositionReady,
    isDecompositionError,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  };
}
