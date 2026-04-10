'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER } from '@/constants';
import { AuditAction, AuditSeverity } from '@/enums';
import type { AuditLogsTabProps } from '@/types';

import { AuditLogsContent } from './audit-logs-content';

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
