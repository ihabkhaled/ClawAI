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
  methodFilter,
  setMethodFilter,
  routeFilter,
  setRouteFilter,
  messageContainsFilter,
  setMessageContainsFilter,
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

        <Select
          value={methodFilter || ALL_FILTER}
          onValueChange={(v) => setMethodFilter(v === ALL_FILTER ? '' : v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Service..."
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder="Controller..."
          value={controllerFilter}
          onChange={(e) => setControllerFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder="Action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder="Route (regex)..."
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="w-[160px]"
        />

        <Input
          placeholder="Message contains..."
          value={messageContainsFilter}
          onChange={(e) => setMessageContainsFilter(e.target.value)}
          className="w-[180px]"
        />

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
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
