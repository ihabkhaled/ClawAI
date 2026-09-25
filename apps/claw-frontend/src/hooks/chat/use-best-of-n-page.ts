import { useCallback, useState } from 'react';

import { BEST_OF_N_CONTENT_MIN_LENGTH, BEST_OF_N_DEFAULT_COUNT } from '@/constants';
import { useBestOfNPoll } from '@/hooks/chat/use-best-of-n-poll';
import { useBestOfNStream } from '@/hooks/chat/use-best-of-n-stream';
import { useOrchestrationComposer } from '@/hooks/chat/use-orchestration-composer';
import { useSendBestOfN } from '@/hooks/chat/use-send-best-of-n';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, ModelSelection, UseBestOfNPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';
import { hasSendableInput } from '@/utilities/composer-send.utility';

export function useBestOfNPage(): UseBestOfNPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [n, setN] = useState(BEST_OF_N_DEFAULT_COUNT);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);
  const composer = useOrchestrationComposer();

  const { send, result, isPending, isError } = useSendBestOfN();

  const threadId = result?.threadId ?? null;
  const { bestOfNResult, isPolling, isBestOfNReady, isBestOfNError, handleViewInThread } =
    useBestOfNPoll(threadId);

  const { stages, hasProgress, streamError } = useBestOfNStream(threadId);

  // Legacy flag — kept on the return shape so existing callers still
  // compile. The shell drives its submit button off `canSubmit` instead
  // because the shell already factors in `isPending` itself.
  const canSend =
    hasSendableInput(content, composer.selectedFileIds.length, BEST_OF_N_CONTENT_MIN_LENGTH) &&
    !isPending &&
    !isPolling;

  // Strict submission gate the OrchestrationPageShell consumes. We
  // deliberately keep this independent of `isPending` because the shell
  // owns the pending-disable state internally.
  const canSubmit =
    hasSendableInput(content, composer.selectedFileIds.length, BEST_OF_N_CONTENT_MIN_LENGTH) &&
    selectedModel !== null;

  const errorMessage = ((): string | null => {
    if (isError) {
      return t('bestOfN.sendFailed');
    }
    if (isBestOfNError) {
      return t('bestOfN.sendFailed');
    }
    if (streamError !== null) {
      return streamError;
    }
    return null;
  })();

  const handleSend = useCallback((): void => {
    if (!canSubmit || isPending || isPolling) {
      return;
    }
    send({
      content: content.trim(),
      n,
      ...buildAdvancedModelSelectionPayload(selectedModel),
      // Omitted entirely when nothing is picked so the BE DTO stays clean.
      ...(composer.selectedFileIds.length > 0 ? { fileIds: composer.selectedFileIds } : {}),
      // Web research. Empty object when the mode is NONE, so "no research"
      // reaches the DTO as an absent field, exactly like `fileIds`.
      ...composer.researchPayload,
    });
    composer.clear();
  }, [canSubmit, isPending, isPolling, send, content, n, selectedModel, composer]);

  // Adapter so the page's `setSelectedModel` matches the shell's
  // `(ModelSelection | null) => void` signature without exposing the
  // `AdvancedModuleModelSelection` alias to consumers.
  const handleSelectModel = useCallback((next: ModelSelection | null): void => {
    setSelectedModel(next);
  }, []);

  return {
    t,
    content,
    setContent,
    n,
    setN,
    selectedModel,
    setSelectedModel: handleSelectModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    stages,
    hasProgress,
    errorMessage,
    bestOfNResult,
    isPolling,
    isBestOfNReady,
    isBestOfNError,
    handleViewInThread,
    composer,
  };
}
