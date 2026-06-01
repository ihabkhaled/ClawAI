import { useCallback, useMemo, useState } from 'react';

import { PIPELINE_CONTENT_MIN_LENGTH } from '@/constants';
import { useChatStream } from '@/hooks/chat/use-chat-stream';
import { usePipelinePoll } from '@/hooks/chat/use-pipeline-poll';
import { useSendPipeline } from '@/hooks/chat/use-send-pipeline';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UsePipelinePageReturn } from '@/types';
import {
  buildAdvancedModelSelectionPayload,
  mapVisibleProgressStagesToOrchestrationStages,
} from '@/utilities';

// Controller hook for the Pipeline Lab page.
//
// Orchestration model:
//   1. The page owns ONE controller hook (this one). The TSX layer renders
//      only — no other hook calls, no inline business logic.
//   2. `useSendPipeline` fires the mutation and exposes the new threadId.
//   3. `usePipelinePoll` periodically reads the assistant reply with the
//      `metadata.pipeline === true` marker (polling acts as a robust
//      fallback for the final result).
//   4. `useChatStream` subscribes to the chat-service SSE channel for the
//      same threadId. The pipeline backend lifts orchestration stages
//      onto RESPONSE_STREAMING events via `emitOrchestrationStage`, so
//      the stage timeline updates live in the output column.
//   5. `mapVisibleProgressStagesToOrchestrationStages` projects the chat
//      stream's VisibleProgressStage[] onto the OrchestrationStage[]
//      shape consumed by the shared <OrchestrationStageTimeline />.
//
// canSubmit gate: requires both a non-empty prompt AND a selectedModel —
// the shared <OrchestrationPageShell /> always picks a specific local
// model (no AUTO).
export function usePipelinePage(): UsePipelinePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState('analyze-reason-format');
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { mutate, data: sendResult, isPending, isError } = useSendPipeline();

  const threadId = sendResult?.threadId ?? null;
  const { pipelineResult, isPolling, isPipelineReady, isPipelineError, handleViewInThread } =
    usePipelinePoll(threadId);

  const streamActive = threadId !== null && !isPipelineReady && !isPipelineError;
  const { progressStages, streamError } = useChatStream(threadId ?? '', streamActive);

  const stages = useMemo(
    () => mapVisibleProgressStagesToOrchestrationStages(progressStages),
    [progressStages],
  );

  const trimmedContent = content.trim();
  const canSend = trimmedContent.length >= PIPELINE_CONTENT_MIN_LENGTH && !isPending && !isPolling;
  const canSubmit = canSend && selectedModel !== null;
  const hasProgress = stages.length > 0;

  const errorMessage = (() => {
    if (isPipelineError) {
      return t('pipeline.sendFailed');
    }
    if (isError) {
      return t('pipeline.sendFailed');
    }
    if (streamError !== null && streamError !== '') {
      return streamError;
    }
    return null;
  })();

  const handleSend = useCallback((): void => {
    if (!canSubmit) {
      return;
    }
    mutate({
      content: trimmedContent,
      template,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSubmit, mutate, trimmedContent, template, selectedModel]);

  return {
    t,
    content,
    setContent,
    template,
    setTemplate,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    isPipelineError,
    pipelineResult,
    isPolling,
    isPipelineReady,
    stages,
    hasProgress,
    errorMessage,
    handleViewInThread,
  };
}
