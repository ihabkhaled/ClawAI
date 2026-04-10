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
import type { ServerLogsTabProps } from '@/types';

import { ServerLogsContent } from './server-logs-content';

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
