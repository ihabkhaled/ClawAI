'use client';

import { ScrollText } from 'lucide-react';
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
import type { ClientLogEntry, ClientLogsTabProps } from '@/types';

function ClientLogEntryRow({ entry }: { entry: ClientLogEntry }): React.ReactElement {
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
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span className="font-mono">{entry.component}</span>
            <span>{entry.action}</span>
            {entry.route ? <span className="font-mono">{entry.route}</span> : null}
            {entry.userId ? <span className="font-mono">{entry.userId}</span> : null}
          </div>
          {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
            <div className="mt-2">
              {isExpanded ? (
                <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(entry.metadata, null, 2)}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClientLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: {
  logs: ClientLogEntry[];
  meta: ClientLogsTabProps['meta'];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading client logs..." />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Failed to load client logs"
        description="Could not fetch client logs. Please try again later."
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No client logs"
        description="Client-side activity logs will appear here as you interact with the application."
      />
    );
  }

  return (
    <>
      <div className="rounded-md border">
        {logs.map((entry) => (
          <ClientLogEntryRow key={entry._id} entry={entry} />
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

export function ClientLogsTab({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
  levelFilter,
  setLevelFilter,
  componentFilter,
  setComponentFilter,
  routeFilter,
  setRouteFilter,
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: ClientLogsTabProps): React.ReactElement {
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
          placeholder="Component..."
          value={componentFilter}
          onChange={(e) => setComponentFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Route..."
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
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

      <ClientLogsContent
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
