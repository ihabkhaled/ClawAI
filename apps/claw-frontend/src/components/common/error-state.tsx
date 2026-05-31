import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/utilities/error-state.utility';
import type { ErrorStateProps } from '@/types';

export function ErrorState({
  title,
  description,
  error,
  onRetry,
  retryLabel,
  requestId,
  icon,
  className,
}: ErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  const detail = description ?? extractErrorMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface-panel-subtle p-8 text-center sm:p-12',
        className,
      )}
    >
      <div className="mb-4 text-destructive">
        {icon ?? <AlertTriangle className="h-10 w-10" aria-hidden />}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title ?? t('common.errorBoundaryTitle')}</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        {detail ?? t('common.errorBoundaryDescription')}
      </p>
      {requestId ? (
        <p className="mb-4 font-mono text-xs text-muted-foreground">{requestId}</p>
      ) : null}
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden />
          {retryLabel ?? t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
