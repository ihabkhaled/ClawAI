import { RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { FileErrorStateProps } from '@/types';

export function FileErrorState({
  status,
  error,
  onRetry,
}: FileErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <XCircle className="text-destructive h-4 w-4" />
        <span className="text-destructive text-sm font-medium">{status}</span>
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        {error ?? t('chat.fileGenerationFailedRetry')}
      </div>
      <Button
        variant="unstyled"
        size="unstyled"
        className="hover:bg-muted mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw className="h-3 w-3" />
        {t('common.retry')}
      </Button>
    </div>
  );
}
