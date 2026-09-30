import { RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { VideoErrorStateProps } from '@/types';

export function VideoErrorState({
  status,
  error,
  provider,
  model,
  onRetry,
}: VideoErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div
      className="border-destructive/30 bg-destructive/5 w-full max-w-full rounded-xl border p-4"
      data-testid="video-generation-error"
    >
      <div className="flex items-center gap-2">
        <XCircle className="text-destructive h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-destructive text-sm font-medium">{status}</span>
      </div>
      <div className="text-muted-foreground mt-1 text-xs break-words">
        {error ?? t('chat.videoGenerationFailedRetry')}
        {provider ? (
          <span className="ms-1 opacity-60">
            ({provider}/{model})
          </span>
        ) : null}
      </div>
      {onRetry ? (
        <Button
          variant="unstyled"
          size="unstyled"
          className="hover:bg-muted touch:min-h-11 mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
