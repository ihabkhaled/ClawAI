import { Shield } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { SEVERITY_COLORS } from '@/constants';
import type { AuditSeverity } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { AuditLog, AuditLogsContentProps, DataTableColumn } from '@/types';

import { AuditDetailRow } from './audit-detail-row';

export function AuditLogsContent({
  auditLogs,
  meta,
  page,
  setPage,
  pageSize,
  setPageSize,
  isLoading,
  isError,
}: AuditLogsContentProps): React.ReactElement {
  const { t } = useTranslation();
  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t('audits.timestamp'),
      render: (row) => new Date(row.createdAt).toLocaleString(),
      className: 'whitespace-nowrap',
    },
    {
      key: 'action',
      header: t('audits.action'),
      render: (row) => <Badge variant="outline">{row.action}</Badge>,
      renderMobileTitle: (row) => (
        <div className="flex flex-col">
          <span>{row.action}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'userId',
      header: t('audits.actor'),
      render: (row) => <span className="font-mono text-xs">{row.userId}</span>,
    },
    {
      key: 'entity',
      header: t('audits.entity'),
      render: (row) => (
        <span className="text-sm">
          {row.entityType ? `${row.entityType}` : '-'}
          {row.entityId ? (
            <span className="text-muted-foreground ms-1 font-mono text-xs">
              {row.entityId.slice(0, 8)}...
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'severity',
      header: t('audits.severity'),
      render: (row) => (
        <Badge variant="outline" className={SEVERITY_COLORS[row.severity as AuditSeverity] ?? ''}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: 'ipAddress',
      header: t('audits.ipAddress'),
      render: (row) => (
        <span className="text-muted-foreground font-mono text-xs">{row.ipAddress ?? '-'}</span>
      ),
    },
    {
      key: 'details',
      header: t('audits.details'),
      render: (row) => <AuditDetailRow row={row} />,
    },
  ];

  if (isLoading) {
    return <LoadingSpinner label={t('audits.loadingAudits')} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Shield}
        title={t('audits.loadFailed')}
        description={t('audits.loadFailedDesc')}
      />
    );
  }

  if (auditLogs.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title={t('audits.noAudits')}
        description={t('audits.noAuditsDesc')}
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={auditLogs}
        keyExtractor={(row) => row._id}
        emptyMessage={t('audits.noMatchingAudits')}
        mobileTitleKey="action"
      />

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
