import { Server } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Pagination } from '@/components/ui/pagination';
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
  pageSize,
  setPageSize,
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

      <Pagination
        page={page}
        pageSize={pageSize}
        totalPages={Math.max(meta.totalPages, 1)}
        totalItems={meta.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        t={t}
      />
    </>
  );
}
