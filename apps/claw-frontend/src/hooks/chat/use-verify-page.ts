import { useCallback, useState } from 'react';

import { VERIFIER_CONTENT_MIN_LENGTH, VERIFIER_DEFAULT_MAX_REVISIONS } from '@/constants';
import { useOrchestrationStages } from '@/hooks/chat/use-orchestration-stages';
import { useSendVerify } from '@/hooks/chat/use-send-verify';
import { useVerifyPoll } from '@/hooks/chat/use-verify-poll';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseVerifyPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useVerifyPage(): UseVerifyPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [maxRevisions, setMaxRevisions] = useState(VERIFIER_DEFAULT_MAX_REVISIONS);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendVerify();

  const threadId = result?.threadId ?? null;
  const { verifyResult, isPolling, isVerifyReady, isVerifyError, handleViewInThread } =
    useVerifyPoll(threadId);

  // The SSE stream is only useful while the request is in-flight or still
  // streaming sub-stages. We turn it off as soon as the result lands or
  // the run fails so the connection drops cleanly.
  const isRunning = isPending || (isPolling && !isVerifyReady && !isVerifyError);
  const { stages } = useOrchestrationStages(threadId, isRunning);

  const trimmedContent = content.trim();
  const meetsMinLength = trimmedContent.length >= VERIFIER_CONTENT_MIN_LENGTH;
  const hasSelectedModel = selectedModel !== null;
  // `canSend` is the legacy/internal gate used by handleSend itself. The
  // shell uses `canSubmit` and adds its own `isPending` check.
  const canSend = meetsMinLength && hasSelectedModel && !isPending && !isPolling;
  const canSubmit = meetsMinLength && hasSelectedModel;
  const hasProgress = stages.length > 0;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({
      content: trimmedContent,
      maxRevisions,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSend, send, trimmedContent, maxRevisions, selectedModel]);

  return {
    t,
    content,
    setContent,
    maxRevisions,
    setMaxRevisions,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    verifyResult,
    isPolling,
    isVerifyReady,
    isVerifyError,
    handleViewInThread,
    stages,
    hasProgress,
    isRunning,
  };
}
