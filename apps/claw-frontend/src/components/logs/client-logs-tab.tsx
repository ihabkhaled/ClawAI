'use client';

import { ScrollText } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
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
import type { ClientLogsTabProps, LogEntry } from '@/types';

function LogEntryRow({ entry }: { entry: LogEntry }): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const levelColor = LOG_LEVEL_COLORS[entry.level] ?? '';

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
            <span>
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            <span className="font-mono">{entry.component}</span>
            <span>{entry.action}</span>
            {entry.userId ? (
              <span className="font-mono">{entry.userId}</span>
            ) : null}
          </div>
          {entry.details ? (
            <div className="mt-2">
              {isExpanded ? (
                <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(entry.details, null, 2)}
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

export function ClientLogsTab({
  logs,
  levelFilter,
  setLevelFilter,
  componentFilter,
  setComponentFilter,
  searchQuery,
  setSearchQuery,
  uniqueComponents,
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

        <Select
          value={componentFilter || ALL_FILTER}
          onValueChange={(v) => setComponentFilter(v === ALL_FILTER ? '' : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Components" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Components</SelectItem>
            {uniqueComponents.map((comp) => (
              <SelectItem key={comp} value={comp}>
                {comp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[250px]"
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No client logs"
          description="Client-side activity logs will appear here as you interact with the application. Use the logger utility to capture structured events."
        />
      ) : (
        <div className="rounded-md border">
          {logs.map((entry) => (
            <LogEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
