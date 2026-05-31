'use client';

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
  judgeEvaluating,
  executingModel,
  judgeModel,
  progressStages,
  currentStageLabel,
  streamLive,
  onCancelStream,
  isCancellingStream,
}: VirtualizedMessagesFooterProps): React.ReactElement | null {
  if (!isWaitingForResponse) {
    return null;
  }
  return (
    <div className="px-4 py-2">
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
