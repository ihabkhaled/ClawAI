import { ScrollText } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Pagination } from '@/components/ui/pagination';
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
  pageSize,
  setPageSize,
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
