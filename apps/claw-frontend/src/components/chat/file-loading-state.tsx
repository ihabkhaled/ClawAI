import { Loader2 } from 'lucide-react';

import type { FileLoadingStateProps } from '@/types';

export function FileLoadingState({
  status,
  prompt,
  format,
}: FileLoadingStateProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">{status}</div>
          {format ? (
            <div className="text-xs text-muted-foreground">{format.toUpperCase()}</div>
          ) : null}
        </div>
      </div>
      <div className="truncate text-xs text-muted-foreground">{prompt}</div>
    </div>
  );
}
