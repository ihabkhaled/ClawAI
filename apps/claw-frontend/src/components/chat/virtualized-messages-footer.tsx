'use client';

import { ChatLimitNoticeCard } from '@/components/chat/chat-limit-notice-card';
import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import type { VirtualizedMessagesFooterProps } from '@/types';

// Pure-render footer mounted as Virtuoso's `components.Footer`. Wraps the
// ThinkingIndicator so the rest of the live-progress UI scrolls inside the
// virtualized viewport (instead of being absolutely positioned over it).
// Returns null when no response is in flight so the bottom of the list does
// not gain phantom padding.
export function VirtualizedMessagesFooter({
  isWaitingForResponse,
  fallbackAttempts,
  streamError,
  limitNotice,
  judgeEvaluating,
  executingModel,
  judgeModel,
  progressStages,
  currentStageLabel,
  streamLive,
  onCancelStream,
  isCancellingStream,
}: VirtualizedMessagesFooterProps): React.ReactElement | null {
  if (!isWaitingForResponse && !streamError && limitNotice === null) {
    return null;
  }
  // The limit notice stays in the transcript after the spinner has gone: the
  // refusal is part of what happened in this thread, and a toast that has
  // already faded leaves a composer that looks like it silently did nothing.
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {limitNotice === null ? null : <ChatLimitNoticeCard notice={limitNotice} />}
      <ThinkingIndicator
        fallbackAttempts={fallbackAttempts}
        streamError={streamError}
        judgeEvaluating={judgeEvaluating}
        executingModel={executingModel}
        judgeModel={judgeModel}
        progressStages={progressStages}
        currentStageLabel={currentStageLabel}
        streamLive={streamLive}
        onCancel={onCancelStream}
        isCancelling={isCancellingStream}
      />
    </div>
  );
}
