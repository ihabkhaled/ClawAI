import { useCallback, useState } from 'react';

import { MIN_CONSENSUS_MODELS, MAX_CONSENSUS_MODELS } from '@/constants';
import { useConsensusPoll } from '@/hooks/chat/use-consensus-poll';
import { useSendConsensus } from '@/hooks/chat/use-send-consensus';
import { useTranslation } from '@/lib/i18n';
import type { UseConsensusPageReturn } from '@/types';

export function useConsensusPage(): UseConsensusPageReturn {
  const { t } = useTranslation();
  const [selectedModels, setSelectedModels] = useState<Array<{ provider: string; model: string }>>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const { send, result, isPending, isError } = useSendConsensus();

  const threadId = result?.threadId ?? null;
  const { synthesisMessage, isPolling, isSynthesisReady, handleViewInThread } =
    useConsensusPoll(threadId);

  const selectionError =
    selectedModels.length > 0 && selectedModels.length < MIN_CONSENSUS_MODELS
      ? t('consensus.minModels', { min: MIN_CONSENSUS_MODELS })
      : null;

  const canSend =
    selectedModels.length >= MIN_CONSENSUS_MODELS &&
    selectedModels.length <= MAX_CONSENSUS_MODELS &&
    prompt.trim().length > 0 &&
    !isPending &&
    !isPolling;

  const handleToggleModel = useCallback(
    (provider: string, model: string, checked: boolean): void => {
      setSelectedModels((prev) => {
        if (checked) {
          if (prev.length >= MAX_CONSENSUS_MODELS) {
            return prev;
          }
          return [...prev, { provider, model }];
        }
        return prev.filter((m) => m.provider !== provider || m.model !== model);
      });
    },
    [],
  );

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({ content: prompt.trim(), models: selectedModels });
  }, [canSend, send, prompt, selectedModels]);

  return {
    t,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    isPending,
    isError,
    canSend,
    selectionError,
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
  };
}
