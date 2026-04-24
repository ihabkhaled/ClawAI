import { RefreshCw, XCircle } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { FileErrorStateProps } from '@/types';

export function FileErrorState({
  status,
  error,
  onRetry,
}: FileErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">{status}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {error ?? t('chat.fileGenerationFailedRetry')}
      </div>
      <button
        className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw className="h-3 w-3" />
        {t('common.retry')}
      </button>
    </div>
  );
}
