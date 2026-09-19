'use client';

import { ChatLimitNoticeCard } from '@/components/chat/chat-limit-notice-card';
import { NarrationLog } from '@/components/chat/narration-log';
import { RuntimeProgressPanel } from '@/components/chat/runtime-progress';
import { useTranslation } from '@/lib/i18n';
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
  narration,
  currentStageLabel,
  streamLive,
  onCancelStream,
  isCancellingStream,
}: VirtualizedMessagesFooterProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (!isWaitingForResponse && !streamError && limitNotice === null) {
    return null;
  }
  // The limit notice stays in the transcript after the spinner has gone: the
  // refusal is part of what happened in this thread, and a toast that has
  // already faded leaves a composer that looks like it silently did nothing.
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {limitNotice === null ? null : <ChatLimitNoticeCard notice={limitNotice} />}
      {/* Only while something is actually running. The notice alone keeps this
          footer mounted, and the panel used to render underneath it regardless
          — so a refused message left "AI is thinking..." live forever, under a
          card explaining that nothing was going to happen. */}
      {/* The live half of the work log. The same component renders the stored
          log on the answer after it lands, so live and after-refresh are one
          view with two data sources. */}
      {isWaitingForResponse && narration !== undefined && narration.length > 0 ? (
        <NarrationLog entries={narration} isLive t={t} />
      ) : null}
      {!isWaitingForResponse && !streamError ? null : (
        <RuntimeProgressPanel
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
      )}
    </div>
  );
}
