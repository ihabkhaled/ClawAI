import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { VideoLoadingStateProps } from '@/types';

export function VideoLoadingState({
  stageText,
  prompt,
  provider,
  model,
  note,
  onCancel,
  cancelLabel,
  cancelAriaLabel,
  isCancelling = false,
}: VideoLoadingStateProps): React.ReactElement {
  return (
    <div className="border-border bg-muted/30 w-full max-w-full rounded-xl border p-4">
      <div className="bg-muted mb-3 flex aspect-video max-h-64 w-full items-center justify-center rounded-lg">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
      <div role="status" aria-live="polite" className="text-sm font-medium">
        {stageText}
      </div>
      {provider ? (
        <div className="text-muted-foreground mt-0.5 text-xs break-words">
          {provider} / {model}
        </div>
      ) : null}
      <div className="text-muted-foreground mt-1 truncate text-xs">{prompt}</div>
      {note ? <div className="text-muted-foreground mt-2 text-xs">{note}</div> : null}
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
          data-testid="video-generation-cancel"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  );
}
