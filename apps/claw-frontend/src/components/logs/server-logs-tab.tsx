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
import { useTranslation } from '@/lib/i18n';
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
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={levelFilter ?? ALL_FILTER}
          onValueChange={(v) => setLevelFilter(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('logs.allLevels')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>{t('logs.allLevels')}</SelectItem>
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
            <SelectValue placeholder={t('logs.methodPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>{t('logs.allMethods')}</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder={t('logs.servicePlaceholder')}
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder={t('logs.controllerPlaceholder')}
          value={controllerFilter}
          onChange={(e) => setControllerFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder={t('logs.actionPlaceholder')}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder={t('logs.routeRegexPlaceholder')}
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="w-[160px]"
        />

        <Input
          placeholder={t('logs.messageContainsPlaceholder')}
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
          placeholder={t('logs.fullTextSearch')}
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
