"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/audit/use-audit-logs";
import { AuditAction, AuditSeverity } from "@/enums";
import type { AuditLog, DataTableColumn } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

const ALL_FILTER = "__all__";

const columns: DataTableColumn<AuditLog>[] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (row) => new Date(row.createdAt).toLocaleString(),
    className: "whitespace-nowrap",
  },
  {
    key: "action",
    header: "Action",
    render: (row) => (
      <Badge variant="outline">{row.action}</Badge>
    ),
  },
  {
    key: "userId",
    header: "Actor",
    render: (row) => (
      <span className="font-mono text-xs">{row.userId}</span>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    render: (row) => (
      <span className="text-sm">
        {row.entityType ? `${row.entityType}` : "-"}
        {row.entityId ? (
          <span className="ml-1 font-mono text-xs text-muted-foreground">
            {row.entityId.slice(0, 8)}...
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "severity",
    header: "Severity",
    render: (row) => (
      <Badge
        variant="outline"
        className={SEVERITY_COLORS[row.severity] ?? ""}
      >
        {row.severity}
      </Badge>
    ),
  },
  {
    key: "details",
    header: "Details",
    render: (row) =>
      row.details ? (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {JSON.stringify(row.details).slice(0, 80)}
          {JSON.stringify(row.details).length > 80 ? "..." : ""}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
];

export default function AuditsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { auditLogs, meta, isLoading, isError } = useAuditLogs({
    page,
    limit: 20,
    action: action as AuditAction | undefined,
    severity: severity as AuditSeverity | undefined,
    search: search || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Audits"
        description="Review activity logs and security audit trails"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={action ?? ALL_FILTER}
          onValueChange={(v) => {
            setAction(v === ALL_FILTER ? undefined : v);
            setPage(1);
          }}
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
          onValueChange={(v) => {
            setSeverity(v === ALL_FILTER ? undefined : v);
            setPage(1);
          }}
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
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-[200px]"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading audit logs..." />
      ) : isError ? (
        <EmptyState
          icon={Shield}
          title="Failed to load audits"
          description="Could not fetch audit logs. Please try again later."
        />
      ) : auditLogs.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No audit entries"
          description="Audit logs will appear here as users perform actions within the platform. All critical operations are tracked automatically."
        />
      ) : (
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
      )}
    </div>
  );
}
