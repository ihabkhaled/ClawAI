import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ImageCancelledStateProps } from '@/types';

/**
 * A chat image card whose generation the owner cancelled. Retry is still
 * offered: image-service answers it with a new successor row.
 */
export function ImageCancelledState({
  label,
  retryLabel,
  onRetry,
}: ImageCancelledStateProps): React.ReactElement {
  return (
    <div className="border-border rounded-xl border p-4" data-testid="image-generation-cancelled">
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
