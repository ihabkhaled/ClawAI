import { useCallback, useState } from 'react';

import { PIPELINE_CONTENT_MIN_LENGTH } from '@/constants';
import { usePipelinePoll } from '@/hooks/chat/use-pipeline-poll';
import { useSendPipeline } from '@/hooks/chat/use-send-pipeline';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UsePipelinePageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function usePipelinePage(): UsePipelinePageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState('analyze-reason-format');
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { mutate, data: sendResult, isPending, isError } = useSendPipeline();

  const threadId = sendResult?.threadId ?? null;
  const { pipelineResult, isPolling, isPipelineReady, isPipelineError, handleViewInThread } =
    usePipelinePoll(threadId);

  const canSend = content.trim().length >= PIPELINE_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    mutate({
      content: content.trim(),
      template,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSend, mutate, content, template, selectedModel]);

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
    isPending,
    isError,
    isPipelineError,
    pipelineResult,
    isPolling,
    isPipelineReady,
    handleViewInThread,
  };
}
