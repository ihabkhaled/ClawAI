import { Loader2 } from 'lucide-react';

import type { ImageLoadingStateProps } from '@/types';

export function ImageLoadingState({
  status,
  prompt,
  provider,
  model,
}: ImageLoadingStateProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex aspect-square max-h-64 w-full items-center justify-center rounded-lg bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{status}</div>
      {provider ? (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {provider} / {model}
        </div>
      ) : null}
      <div className="mt-1 truncate text-xs text-muted-foreground">{prompt}</div>
    </div>
  );
}
