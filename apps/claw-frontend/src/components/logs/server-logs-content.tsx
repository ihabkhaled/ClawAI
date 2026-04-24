import { Server } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { useServerLogStats } from '@/hooks/logs/use-server-log-stats';
import { useTranslation } from '@/lib/i18n';
import type { ServerLogsContentProps } from '@/types';

import { ServerLogEntryRow } from './server-log-entry-row';
import { ServerLogsStats } from './server-logs-stats';

export function ServerLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: ServerLogsContentProps): React.ReactElement {
  const { t } = useTranslation();
  const { stats, isLoading: isStatsLoading } = useServerLogStats();

  if (isLoading) {
    return <LoadingSpinner label={t('logs.loadingServer')} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Server}
        title={t('logs.failedToLoadServer')}
        description={t('logs.failedToLoadServerDesc')}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title={t('logs.noServerLogs')}
        description={t('logs.noServerLogsActivityDesc')}
      />
    );
  }

  return (
    <>
      {stats && !isStatsLoading ? <ServerLogsStats stats={stats} /> : null}

      <div className="rounded-md border">
        {logs.map((entry) => (
          <ServerLogEntryRow key={entry._id} entry={entry} />
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
