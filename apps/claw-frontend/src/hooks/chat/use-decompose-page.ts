import { useCallback, useState } from 'react';

import { DECOMPOSE_CONTENT_MIN_LENGTH } from '@/constants';
import { useDecomposePoll } from '@/hooks/chat/use-decompose-poll';
import { useSendDecompose } from '@/hooks/chat/use-send-decompose';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseDecomposePageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useDecomposePage(): UseDecomposePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [maxSubTasks, setMaxSubTasks] = useState(3);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendDecompose();

  const threadId = result?.threadId ?? null;
  const {
    decompositionResult,
    isPolling,
    isDecompositionReady,
    isDecompositionError,
    handleViewInThread,
  } = useDecomposePoll(threadId);

  const canSend = content.trim().length >= DECOMPOSE_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({
      content: content.trim(),
      maxSubTasks,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSend, send, content, maxSubTasks, selectedModel]);

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
    isPending,
    isError,
    decompositionResult,
    isPolling,
    isDecompositionReady,
    isDecompositionError,
    handleViewInThread,
  };
}
