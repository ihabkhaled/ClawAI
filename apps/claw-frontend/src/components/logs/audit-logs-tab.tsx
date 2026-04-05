'use client';

import { Shield } from 'lucide-react';
import { useState } from 'react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER, SEVERITY_COLORS } from '@/constants';
import { AuditAction, AuditSeverity } from '@/enums';
import type { AuditLog, AuditLogsTabProps, DataTableColumn } from '@/types';

function AuditDetailRow({ row }: { row: AuditLog }): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!row.details) {
    return <span className="text-muted-foreground">-</span>;
  }

  const detailsStr = JSON.stringify(row.details, null, 2);
  const isLong = detailsStr.length > 80;

  if (!isLong) {
    return (
      <span className="block max-w-[300px] truncate font-mono text-xs text-muted-foreground">
        {detailsStr}
      </span>
    );
  }

  return (
    <div className="max-w-[300px]">
      {isExpanded ? (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
          {detailsStr}
        </pre>
      ) : (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {detailsStr.slice(0, 80)}...
        </span>
      )}
      <button
        type="button"
        className="mt-1 text-xs text-primary underline"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
}

function AuditLogsContent({
  auditLogs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: {
  auditLogs: AuditLog[];
  meta: { page: number; totalPages: number; total: number };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  isError: boolean;
}): React.ReactElement {
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

export function AuditLogsTab({
  auditLogs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
  action,
  setAction,
  severity,
  setSeverity,
  search,
  setSearch,
  entityType,
  setEntityType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: AuditLogsTabProps): React.ReactElement {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={action ?? ALL_FILTER}
          onValueChange={(v) => setAction(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Actions</SelectItem>
            {Object.values(AuditAction).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severity ?? ALL_FILTER}
          onValueChange={(v) => setSeverity(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Severities</SelectItem>
            {Object.values(AuditSeverity).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Entity type..."
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder="End date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Search across all fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-[250px]"
        />
      </div>

      <AuditLogsContent
        auditLogs={auditLogs}
        meta={meta}
        page={page}
        setPage={setPage}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}
