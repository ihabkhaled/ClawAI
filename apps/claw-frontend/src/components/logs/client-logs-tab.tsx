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
import { LogLevel } from '@/enums';
import type { ClientLogsTabProps } from '@/types';

import { ClientLogsContent } from './client-logs-content';

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
  actionFilter,
  setActionFilter,
  routeFilter,
  setRouteFilter,
  userIdFilter,
  setUserIdFilter,
  messageContainsFilter,
  setMessageContainsFilter,
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
          placeholder="Action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder="Route..."
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="User ID..."
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Message contains..."
          value={messageContainsFilter}
          onChange={(e) => setMessageContainsFilter(e.target.value)}
          className="w-[180px]"
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
          placeholder="Full-text search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[220px]"
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
