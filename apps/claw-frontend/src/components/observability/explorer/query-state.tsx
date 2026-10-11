import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { QueryStateProps } from '@/types/observability-explorer.types';

/** Loading, error (with retry), empty, or the content: one place so every section behaves alike. */
export function QueryState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  children,
  t,
}: QueryStateProps): ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('usageAnalytics.loading')} className="min-h-[120px]" />;
  }
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('usageAnalytics.errorTitle')}
        description={t('usageAnalytics.errorDescription')}
        variant={EmptyStateVariant.Compact}
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (isEmpty) {
    return (
      <EmptyState
        icon={Inbox}
        title={t('usageAnalytics.empty')}
        variant={EmptyStateVariant.Compact}
      />
    );
  }
  return <>{children}</>;
}
