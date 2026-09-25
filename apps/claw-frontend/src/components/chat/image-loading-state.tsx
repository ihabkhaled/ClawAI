import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ImageLoadingStateProps } from '@/types';

export function ImageLoadingState({
  status,
  prompt,
  provider,
  model,
  stageText,
  onCancel,
  cancelLabel,
  cancelAriaLabel,
  isCancelling = false,
}: ImageLoadingStateProps): React.ReactElement {
  return (
    <div className="border-border bg-muted/30 rounded-xl border p-4">
      <div className="bg-muted mb-3 flex aspect-square max-h-64 w-full items-center justify-center rounded-lg">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
      <div className="text-sm font-medium">{status}</div>
      <div role="status" aria-live="polite" className="text-muted-foreground mt-0.5 text-xs">
        {stageText}
      </div>
      {provider ? (
        <div className="text-muted-foreground mt-0.5 text-xs">
          {provider} / {model}
        </div>
      ) : null}
      <div className="text-muted-foreground mt-1 truncate text-xs">{prompt}</div>
      {onCancel ? (
        <Button
          variant="unstyled"
          size="unstyled"
          className="hover:bg-muted touch:min-h-11 mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60"
          onClick={onCancel}
          disabled={isCancelling}
          aria-label={cancelAriaLabel}
          aria-busy={isCancelling}
          type="button"
          data-testid="image-generation-cancel"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  );
}
