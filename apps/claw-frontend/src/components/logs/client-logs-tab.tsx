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
