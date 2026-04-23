import { useCallback, useState } from 'react';

import { BEST_OF_N_CONTENT_MIN_LENGTH } from '@/constants';
import { useBestOfNPoll } from '@/hooks/chat/use-best-of-n-poll';
import { useSendBestOfN } from '@/hooks/chat/use-send-best-of-n';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseBestOfNPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useBestOfNPage(): UseBestOfNPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [n, setN] = useState(3);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendBestOfN();

  const threadId = result?.threadId ?? null;
  const { bestOfNResult, isPolling, isBestOfNReady, isBestOfNError, handleViewInThread } =
    useBestOfNPoll(threadId);

  const canSend = content.trim().length >= BEST_OF_N_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({
      content: content.trim(),
      n,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSend, send, content, n, selectedModel]);

  return {
    t,
    content,
    setContent,
    n,
    setN,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    isPending,
    isError,
    bestOfNResult,
    isPolling,
    isBestOfNReady,
    isBestOfNError,
    handleViewInThread,
  };
}
