import { Shield } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEVERITY_COLORS } from '@/constants';
import type { AuditSeverity } from '@/enums';
import type { AuditContentProps, AuditLog, DataTableColumn } from '@/types';

export function AuditContent({
  isLoading,
  isError,
  auditLogs,
  meta,
  page,
  setPage,
  t,
}: AuditContentProps): React.ReactElement {
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
            <span className="ms-1 font-mono text-xs text-muted-foreground">
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
      key: 'details',
      header: t('audits.details'),
      render: (row) =>
        row.details ? (
          <span className="block max-w-[200px] truncate text-xs text-muted-foreground">
            {JSON.stringify(row.details).slice(0, 80)}
            {JSON.stringify(row.details).length > 80 ? '...' : ''}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
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
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </>
  );
}
