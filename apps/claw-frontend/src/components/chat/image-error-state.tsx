import { ChevronDown, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IMAGE_MODEL_OPTIONS } from '@/constants';
import { useImageErrorState } from '@/hooks/chat/use-image-error-state';
import { useTranslation } from '@/lib/i18n';
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
  const { t } = useTranslation();
  const { isPickerOpen, togglePicker, closePicker } = useImageErrorState();
  const currentKey = `${provider ?? ''}/${model ?? ''}`;

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <XCircle className="text-destructive h-4 w-4" />
        <span className="text-destructive text-sm font-medium">{status}</span>
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        {error ?? t('chat.imageGenerationFailedRetry')}
        {provider ? (
          <span className="ms-1 opacity-60">
            ({provider}/{model})
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <Button
          variant="unstyled"
          size="unstyled"
          className="hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw className="h-3 w-3" />
          {t('common.retry')}
        </Button>
        {showModelPicker && onRetryWithModel ? (
          <div className="relative">
            <Button
              variant="unstyled"
              size="unstyled"
              className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              onClick={togglePicker}
              type="button"
            >
              <RefreshCw className="h-3 w-3" />
              {t('chat.tryAnotherModel')}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {isPickerOpen ? (
              <div className="bg-popover absolute start-0 top-full z-10 mt-1 min-w-48 rounded-lg border p-1 shadow-md">
                {IMAGE_MODEL_OPTIONS.filter(
                  (opt) => `${opt.provider}/${opt.model}` !== currentKey,
                ).map((opt) => (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    key={`${opt.provider}-${opt.model}`}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-xs"
                    onClick={() => {
                      onRetryWithModel(opt.provider, opt.model);
                      closePicker();
                    }}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
