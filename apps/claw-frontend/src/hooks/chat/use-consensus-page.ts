import { useCallback, useState } from 'react';

import { MAX_CONSENSUS_MODELS, MIN_CONSENSUS_MODELS } from '@/constants';
import { useConsensusPoll } from '@/hooks/chat/use-consensus-poll';
import { useOrchestrationStages } from '@/hooks/chat/use-orchestration-stages';
import { useSendConsensus } from '@/hooks/chat/use-send-consensus';
import { useTranslation } from '@/lib/i18n';
import type { ModelSelection, UseConsensusPageReturn } from '@/types';

// Controller hook for the Consensus Mode lab page. Composes the
// orchestration-shell single-model picker (`selectedModel`) with the
// existing multi-model picker (`selectedModels`) so the page can adopt
// the shared <OrchestrationPageShell> without breaking the consensus
// backend's hard 2-5 model requirement (see consensusMessageSchema).
//
// The shell-mandated `selectedModel` doubles as the "lead" model — it
// is auto-merged into the multi-model fleet on submit so a user who
// only picks the lead can still kick off a 2-model consensus by
// adding at least one extra model via the picker.
//
// Live progress flows from chat-service's SSE channel for the current
// thread via `useOrchestrationStages`, which surfaces both `stages`
// (timeline rows) and `errorMessage` (terminal ERROR event payload).
// `hasProgress` is exposed so the shell can swap the loading skeleton
// for the live timeline as soon as the first stage event arrives.
export function useConsensusPage(): UseConsensusPageReturn {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);
  const [selectedModels, setSelectedModels] = useState<Array<{ provider: string; model: string }>>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const { send, result, isPending, isError } = useSendConsensus();

  const threadId = result?.threadId ?? null;
  const { synthesisMessage, isPolling, isSynthesisReady, handleViewInThread } =
    useConsensusPoll(threadId);

  // Stream subscription stays open while the mutation is in-flight or
  // the poll has not yet seen the synthesis row. It drops as soon as
  // either terminal condition is reached.
  const isStreamActive = isPending || (isPolling && !isSynthesisReady);
  const {
    stages,
    hasProgress,
    errorMessage: streamErrorMessage,
  } = useOrchestrationStages(threadId, isStreamActive);

  const trimmedPrompt = prompt.trim();
  const hasContent = trimmedPrompt.length > 0;
  const hasLeadModel = selectedModel !== null;

  // Legacy gate — keeps the in-page picker's "select at least 2 models"
  // warning behaving exactly as before for backwards compatibility.
  const selectionError =
    selectedModels.length > 0 && selectedModels.length < MIN_CONSENSUS_MODELS
      ? t('consensus.minModels', { min: MIN_CONSENSUS_MODELS })
      : null;

  // `canSubmit` follows the shell contract: ONLY content + lead model
  // gate the submit button. We merge the lead into the multi-model
  // fleet on submit and back-stop the BE's 2-model minimum inline.
  const canSubmit = hasContent && hasLeadModel && !isPending && !isPolling;

  // Legacy `canSend` (still surfaced for any downstream consumer that
  // wants the strict multi-model gate). Same gate the old page used.
  const canSend =
    selectedModels.length >= MIN_CONSENSUS_MODELS &&
    selectedModels.length <= MAX_CONSENSUS_MODELS &&
    hasContent &&
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
    if (!canSubmit || selectedModel === null) {
      return;
    }

    // Merge the lead model into the fleet so a user who only ticked
    // the shell's single-model picker can still satisfy the BE's
    // 2-model minimum (we add the lead exactly once at position 0).
    const leadEntry = { provider: selectedModel.provider, model: selectedModel.model };
    const fleetWithoutLead = selectedModels.filter(
      (m) => m.provider !== leadEntry.provider || m.model !== leadEntry.model,
    );
    const fleet: Array<{ provider: string; model: string }> = [leadEntry, ...fleetWithoutLead];

    // If the user has not added any extras, the fleet is just the
    // lead — below the BE's 2-model min. Block the submit; the
    // selectionError copy guides the user to add another.
    if (fleet.length < MIN_CONSENSUS_MODELS) {
      return;
    }
    if (fleet.length > MAX_CONSENSUS_MODELS) {
      return;
    }

    send({ content: trimmedPrompt, models: fleet });
  }, [canSubmit, send, trimmedPrompt, selectedModel, selectedModels]);

  // Resolve a user-visible error message. Mutation failures surface
  // through `useSendConsensus.onError` (toast) but we also expose them
  // through the shell's Alert variant for in-place feedback.
  let errorMessage: string | null = null;
  if (streamErrorMessage !== null) {
    errorMessage = streamErrorMessage;
  } else if (isError) {
    errorMessage = t('consensus.sendFailed');
  }

  return {
    t,
    selectedModel,
    setSelectedModel,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    isPending,
    isError,
    canSend,
    canSubmit,
    selectionError,
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  };
}
