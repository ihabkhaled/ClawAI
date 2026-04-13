import { useCallback, useState } from 'react';

import { MAX_CHAIN_STEPS, MIN_CHAIN_STEPS } from '@/constants';
import { useEscalationPoll } from '@/hooks/chat/use-escalation-poll';
import { useSendEscalationChain } from '@/hooks/chat/use-send-escalation-chain';
import { useTranslation } from '@/lib/i18n';
import type { EscalationChainStep, UseEscalationPageReturn } from '@/types';

export function useEscalationPage(): UseEscalationPageReturn {
  const { t } = useTranslation();
  const [chainModels, setChainModels] = useState<EscalationChainStep[]>([]);
  const [prompt, setPrompt] = useState('');
  const { send, result, isPending, isError } = useSendEscalationChain();

  const threadId = result?.threadId ?? null;
  const { synthesisMessage, isPolling, isSynthesisReady, handleViewInThread } =
    useEscalationPoll(threadId);

  const selectionError =
    chainModels.length > 0 && chainModels.length < MIN_CHAIN_STEPS
      ? t('escalation.minSteps', { min: MIN_CHAIN_STEPS })
      : null;

  const canSend =
    chainModels.length >= MIN_CHAIN_STEPS &&
    chainModels.length <= MAX_CHAIN_STEPS &&
    prompt.trim().length > 0 &&
    !isPending &&
    !isPolling;

  const handleAddModel = useCallback((provider: string, model: string): void => {
    setChainModels((prev) => {
      if (prev.length >= MAX_CHAIN_STEPS) {
        return prev;
      }
      return [...prev, { provider, model }];
    });
  }, []);

  const handleRemoveModel = useCallback((index: number): void => {
    setChainModels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveUp = useCallback((index: number): void => {
    if (index === 0) {
      return;
    }
    setChainModels((prev) => {
      const next = [...prev];
      const above = next[index - 1];
      const current = next[index];
      if (!above || !current) {
        return prev;
      }
      next[index - 1] = current;
      next[index] = above;
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number): void => {
    setChainModels((prev) => {
      if (index >= prev.length - 1) {
        return prev;
      }
      const next = [...prev];
      const below = next[index + 1];
      const current = next[index];
      if (!below || !current) {
        return prev;
      }
      next[index + 1] = current;
      next[index] = below;
      return next;
    });
  }, []);

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({ content: prompt.trim(), chain: chainModels });
  }, [canSend, send, prompt, chainModels]);

  return {
    t,
    chainModels,
    prompt,
    setPrompt,
    handleAddModel,
    handleRemoveModel,
    handleMoveUp,
    handleMoveDown,
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
