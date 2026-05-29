import { cn } from '@/lib/utils';
import type { StreamLiveAnswerProps } from '@/types';

// Renders the live answer text as it streams. Raw text (whitespace preserved)
// during active streaming to avoid markdown re-parse flicker; the finalized
// message bubble renders rich markdown once the stream completes. A blinking
// ghost cursor signals active generation.
export function StreamLiveAnswer({
  content,
  isStreaming,
  className,
}: StreamLiveAnswerProps): React.ReactElement | null {
  if (content.length === 0) {
    return null;
  }
  return (
    <div className={cn('whitespace-pre-wrap break-words text-sm text-foreground', className)}>
      {content}
      {isStreaming ? (
        <span
          className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-sky-500 align-text-bottom"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
