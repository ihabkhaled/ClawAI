'use client';

import { Server } from 'lucide-react';
import { useState } from 'react';

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
import { ALL_FILTER, LOG_LEVEL_COLORS } from '@/constants';
import { LogLevel } from '@/enums';
import type { ServerLogEntry, ServerLogsTabProps } from '@/types';

function ServerLogEntryRow({ entry }: { entry: ServerLogEntry }): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const levelColor = LOG_LEVEL_COLORS[entry.level as LogLevel] ?? '';

  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={levelColor}>
          {entry.level}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entry.message}</span>
            {entry.statusCode ? (
              <Badge variant="outline" className="text-xs">
                {entry.statusCode}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span className="font-mono">{entry.serviceName}</span>
            {entry.controller ? <span>{entry.controller}</span> : null}
            {entry.action ? <span>{entry.action}</span> : null}
            {entry.method && entry.route ? (
              <span className="font-mono">
                {entry.method} {entry.route}
              </span>
            ) : null}
            {entry.latencyMs ? <span>{entry.latencyMs}ms</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {entry.requestId ? (
              <span className="font-mono">req: {entry.requestId.slice(0, 8)}</span>
            ) : null}
            {entry.traceId ? (
              <span className="font-mono">trace: {entry.traceId.slice(0, 8)}</span>
            ) : null}
            {entry.userId ? (
              <span className="font-mono">user: {entry.userId.slice(0, 8)}</span>
            ) : null}
            {entry.errorCode ? (
              <span className="text-destructive">{entry.errorCode}</span>
            ) : null}
          </div>
          {entry.errorMessage ? (
            <p className="mt-1 text-xs text-destructive">{entry.errorMessage}</p>
          ) : null}
          <div className="mt-2">
            {isExpanded ? (
              <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                {JSON.stringify(
                  {
                    provider: entry.provider || undefined,
                    model: entry.model || undefined,
                    connectorId: entry.connectorId || undefined,
                    threadId: entry.threadId || undefined,
                    metadata: entry.metadata,
                  },
                  null,
                  2,
                )}
              </pre>
            ) : null}
            <button
              type="button"
              className="mt-1 text-xs text-primary underline"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServerLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: {
  logs: ServerLogEntry[];
  meta: ServerLogsTabProps['meta'];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading server logs..." />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Server}
        title="Failed to load server logs"
        description="Could not fetch server logs. Please try again later."
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No server logs"
        description="Server-side activity logs will appear here as services process requests."
      />
    );
  }

  return (
    <>
      <div className="rounded-md border">
        {logs.map((entry) => (
          <ServerLogEntryRow key={entry._id} entry={entry} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

export function ServerLogsTab({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
  levelFilter,
  setLevelFilter,
  serviceFilter,
  setServiceFilter,
  controllerFilter,
  setControllerFilter,
  actionFilter,
  setActionFilter,
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: ServerLogsTabProps): React.ReactElement {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={levelFilter ?? ALL_FILTER}
          onValueChange={(v) => setLevelFilter(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Levels</SelectItem>
            {Object.values(LogLevel).map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Service..."
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Controller..."
          value={controllerFilter}
          onChange={(e) => setControllerFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
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
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[250px]"
        />
      </div>

      <ServerLogsContent
        logs={logs}
        meta={meta}
        page={page}
        setPage={setPage}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}
