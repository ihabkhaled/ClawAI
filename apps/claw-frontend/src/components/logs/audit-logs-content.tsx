import { Shield } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEVERITY_COLORS } from '@/constants';
import type { AuditSeverity } from '@/enums';
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
  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => new Date(row.createdAt).toLocaleString(),
      className: 'whitespace-nowrap',
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <Badge variant="outline">{row.action}</Badge>,
    },
    {
      key: 'userId',
      header: 'Actor',
      render: (row) => <span className="font-mono text-xs">{row.userId}</span>,
    },
    {
      key: 'entity',
      header: 'Entity',
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
      header: 'Severity',
      render: (row) => (
        <Badge variant="outline" className={SEVERITY_COLORS[row.severity as AuditSeverity] ?? ''}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.ipAddress ?? '-'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) => <AuditDetailRow row={row} />,
    },
  ];

  if (isLoading) {
    return <LoadingSpinner label="Loading audit logs..." />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Shield}
        title="Failed to load audits"
        description="Could not fetch audit logs. Please try again later."
      />
    );
  }

  if (auditLogs.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No audit entries"
        description="Audit logs will appear here as users perform actions within the platform."
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={auditLogs}
        keyExtractor={(row) => row._id}
        emptyMessage="No audit logs match your filters."
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
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
