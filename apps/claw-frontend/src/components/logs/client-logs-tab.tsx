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

        <Input
          placeholder={t('logs.componentPlaceholder')}
          value={componentFilter}
          onChange={(e) => setComponentFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder={t('logs.actionPlaceholder')}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-[140px]"
        />

        <Input
          placeholder={t('logs.routePlaceholder')}
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder={t('logs.userIdPlaceholder')}
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder={t('logs.messageContainsPlaceholder')}
          value={messageContainsFilter}
          onChange={(e) => setMessageContainsFilter(e.target.value)}
          className="w-[180px]"
        />

        <Input
          type="date"
          placeholder={t('logs.startDate')}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder={t('logs.endDate')}
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
