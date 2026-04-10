import { ChevronDown, RefreshCw, XCircle } from 'lucide-react';

import { IMAGE_MODEL_OPTIONS } from '@/constants';
import { useImageErrorState } from '@/hooks/chat/use-image-error-state';
import type { ImageErrorStateProps } from '@/types';

export function ImageErrorState({
  status,
  error,
  provider,
  model,
  onRetry,
  showModelPicker,
  onRetryWithModel,
}: ImageErrorStateProps): React.ReactElement {
  const { isPickerOpen, togglePicker, closePicker } = useImageErrorState();
  const currentKey = `${provider ?? ''}/${model ?? ''}`;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">{status}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {error ?? 'Image generation failed. Please try again.'}
        {provider ? (
          <span className="ms-1 opacity-60">
            ({provider}/{model})
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
        {showModelPicker && onRetryWithModel ? (
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
              onClick={togglePicker}
              type="button"
            >
              <RefreshCw className="h-3 w-3" />
              Try another model
              <ChevronDown className="h-3 w-3" />
            </button>
            {isPickerOpen ? (
              <div className="absolute start-0 top-full z-10 mt-1 min-w-48 rounded-lg border bg-popover p-1 shadow-md">
                {IMAGE_MODEL_OPTIONS.filter(
                  (opt) => `${opt.provider}/${opt.model}` !== currentKey,
                ).map((opt) => (
                  <button
                    key={`${opt.provider}-${opt.model}`}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-xs hover:bg-muted"
                    onClick={() => {
                      onRetryWithModel(opt.provider, opt.model);
                      closePicker();
                    }}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
