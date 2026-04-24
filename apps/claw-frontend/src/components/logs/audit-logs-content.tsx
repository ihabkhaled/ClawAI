import { Shield } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      key: 'ipAddress',
      header: t('audits.ipAddress'),
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.ipAddress ?? '-'}</span>
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
      />

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
