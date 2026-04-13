import { useCallback, useState } from 'react';

import { COST_ENSEMBLE_CONTENT_MIN_LENGTH } from '@/constants';
import { useCostEnsemblePoll } from '@/hooks/chat/use-cost-ensemble-poll';
import { useSendCostEnsemble } from '@/hooks/chat/use-send-cost-ensemble';
import { useTranslation } from '@/lib/i18n';
import type { UseCostEnsemblePageReturn } from '@/types';

export function useCostEnsemblePage(): UseCostEnsemblePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');

  const { send, result, isPending, isError } = useSendCostEnsemble();

  const threadId = result?.threadId ?? null;
  const {
    costEnsembleResult,
    isPolling,
    isCostEnsembleReady,
    isCostEnsembleError,
    handleViewInThread,
  } = useCostEnsemblePoll(threadId);

  const canSend =
    content.trim().length >= COST_ENSEMBLE_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({ content: content.trim() });
  }, [canSend, send, content]);

  return {
    t,
    content,
    setContent,
    handleSend,
    canSend,
    isPending,
    isError,
    costEnsembleResult,
    isPolling,
    isCostEnsembleReady,
    isCostEnsembleError,
    handleViewInThread,
  };
}
