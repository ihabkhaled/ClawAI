import { useCallback, useState } from 'react';

import { MAX_CHAIN_STEPS, MIN_CHAIN_STEPS } from '@/constants';
import { useEscalationPoll } from '@/hooks/chat/use-escalation-poll';
import { useOrchestrationStages } from '@/hooks/chat/use-orchestration-stages';
import { useSendEscalationChain } from '@/hooks/chat/use-send-escalation-chain';
import { useTranslation } from '@/lib/i18n';
import type {
  AdvancedModuleModelSelection,
  EscalationChainStep,
  UseEscalationPageReturn,
} from '@/types';

export function useEscalationPage(): UseEscalationPageReturn {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);
  const [additionalChainModels, setAdditionalChainModels] = useState<EscalationChainStep[]>([]);
  const [prompt, setPrompt] = useState('');
  const { send, result, isPending, isError } = useSendEscalationChain();

  const threadId = result?.threadId ?? null;
  const { synthesisMessage, isPolling, isSynthesisReady, handleViewInThread } =
    useEscalationPoll(threadId);

  // Subscribe to chat-service SSE for the current thread and project
  // orchestration_stage events into the shared OrchestrationStage[] shape
  // consumed by <OrchestrationPageShell>. Active while the mutation is
  // in flight OR the poll has not yet seen the synthesis row.
  const isStreamActive = isPending || (isPolling && !isSynthesisReady);
  const { stages } = useOrchestrationStages(threadId, isStreamActive);

  // The PRIMARY model is step 1 of the chain (picked in the shell's
  // single-model select). additionalChainModels are subsequent escalation
  // steps. Combined length must satisfy BE bounds [MIN_CHAIN_STEPS, MAX_CHAIN_STEPS].
  const totalChainLength = (selectedModel === null ? 0 : 1) + additionalChainModels.length;

  // Surface validation copy in the chain-builder column. We show the
  // min-steps warning only after the user has picked the primary model
  // (so the empty state doesn't immediately yell at first paint).
  let selectionError: string | null = null;
  if (selectedModel !== null && totalChainLength < MIN_CHAIN_STEPS) {
    selectionError = t('escalation.minSteps', { min: MIN_CHAIN_STEPS });
  } else if (totalChainLength > MAX_CHAIN_STEPS) {
    selectionError = t('escalation.maxSteps', { max: MAX_CHAIN_STEPS });
  }

  const canSubmit =
    selectedModel !== null &&
    prompt.trim().length > 0 &&
    totalChainLength >= MIN_CHAIN_STEPS &&
    totalChainLength <= MAX_CHAIN_STEPS &&
    !isPending &&
    !isPolling;

  const handleAddModel = useCallback((provider: string, model: string): void => {
    setAdditionalChainModels((prev) => {
      // -1 because the primary model counts as step 1 of the chain.
      if (prev.length >= MAX_CHAIN_STEPS - 1) {
        return prev;
      }
      return [...prev, { provider, model }];
    });
  }, []);

  const handleRemoveModel = useCallback((index: number): void => {
    setAdditionalChainModels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveUp = useCallback((index: number): void => {
    if (index === 0) {
      return;
    }
    setAdditionalChainModels((prev) => {
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
    setAdditionalChainModels((prev) => {
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
    if (!canSubmit || selectedModel === null) {
      return;
    }
    const fullChain: EscalationChainStep[] = [
      { provider: selectedModel.provider, model: selectedModel.model },
      ...additionalChainModels,
    ];
    send({ content: prompt.trim(), chain: fullChain });
  }, [canSubmit, send, prompt, selectedModel, additionalChainModels]);

  return {
    t,
    selectedModel,
    setSelectedModel,
    additionalChainModels,
    prompt,
    setPrompt,
    handleAddModel,
    handleRemoveModel,
    handleMoveUp,
    handleMoveDown,
    handleSend,
    isPending,
    isError,
    canSubmit,
    selectionError,
    stages,
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
  };
}
