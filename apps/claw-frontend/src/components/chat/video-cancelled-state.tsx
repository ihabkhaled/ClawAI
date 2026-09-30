import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { VideoCancelledStateProps } from '@/types';

/**
 * A chat video card whose generation the owner cancelled. Retry is still
 * offered: video-service answers it with a new successor row.
 */
export function VideoCancelledState({
  label,
  retryLabel,
  onRetry,
}: VideoCancelledStateProps): React.ReactElement {
  return (
    <div
      className="border-border w-full max-w-full rounded-xl border p-4"
      data-testid="video-generation-cancelled"
    >
      <div role="status" className="text-muted-foreground text-sm font-medium">
        {label}
      </div>
      <Button
        variant="unstyled"
        size="unstyled"
        className="hover:bg-muted touch:min-h-11 mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        {retryLabel}
      </Button>
    </div>
  );
}
