import { ScrollText } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { useClientLogStats } from '@/hooks/logs/use-client-log-stats';
import { useTranslation } from '@/lib/i18n';
import type { ClientLogsContentProps } from '@/types';

import { ClientLogEntryRow } from './client-log-entry-row';
import { ClientLogsStats } from './client-logs-stats';

export function ClientLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: ClientLogsContentProps): React.ReactElement {
  const { t } = useTranslation();
  const { stats, isLoading: isStatsLoading } = useClientLogStats();

  if (isLoading) {
    return <LoadingSpinner label={t('logs.loadingClient')} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t('logs.failedToLoadClient')}
        description={t('logs.failedToLoadClientDesc')}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t('logs.noClientLogs')}
        description={t('logs.noClientLogsActivityDesc')}
      />
    );
  }

  return (
    <>
      {stats && !isStatsLoading ? <ClientLogsStats stats={stats} /> : null}

      <div className="rounded-md border">
        {logs.map((entry) => (
          <ClientLogEntryRow key={entry._id} entry={entry} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('common.showingPage', {
            page: String(meta.page),
            totalPages: String(meta.totalPages),
            total: String(meta.total),
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </>
  );
}
