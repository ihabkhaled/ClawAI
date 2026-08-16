import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SMART_ROUTER_ALL_STATUSES_VALUE,
  SMART_ROUTER_STATUS_FILTER_OPTIONS,
  SMART_ROUTER_STATUS_LABEL_KEYS,
} from '@/constants/smart-router-admin.constants';
import type { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import type { SmartRouterRevisionsTabProps } from '@/types/smart-router-admin.types';

import { SmartRouterRevisionRow } from './smart-router-revision-row';

export function SmartRouterRevisionsTab({
  revisions,
  meta,
  statusFilter,
  onStatusFilterChange,
  page,
  onPageChange,
  isLoading,
  isError,
  error,
  selectedRevisionId,
  onSelectRevision,
  onCreateDraft,
  isCreateDraftPending,
  t,
}: SmartRouterRevisionsTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={statusFilter ?? SMART_ROUTER_ALL_STATUSES_VALUE}
          onValueChange={(value: string) =>
            onStatusFilterChange(
              value === SMART_ROUTER_ALL_STATUSES_VALUE
                ? undefined
                : (value as RouterConfigurationStatus),
            )
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SMART_ROUTER_ALL_STATUSES_VALUE}>
              {t('smartRouterAdmin.revisions.filterAllStatuses')}
            </SelectItem>
            {SMART_ROUTER_STATUS_FILTER_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(SMART_ROUTER_STATUS_LABEL_KEYS[status])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={onCreateDraft} disabled={isCreateDraftPending}>
          {t('smartRouterAdmin.revisions.createDraft')}
        </Button>
      </div>

      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

      {isError ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
          role="alert"
        >
          {error?.message ?? t('common.error')}
        </div>
      ) : null}

      {!isLoading && !isError && revisions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.revisions.empty')}</p>
      ) : null}

      {!isLoading && !isError && revisions.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('smartRouterAdmin.revisions.columnRevision')}</TableHead>
                <TableHead>{t('smartRouterAdmin.revisions.columnStatus')}</TableHead>
                <TableHead>{t('smartRouterAdmin.revisions.columnMode')}</TableHead>
                <TableHead>{t('smartRouterAdmin.revisions.columnEntries')}</TableHead>
                <TableHead>{t('smartRouterAdmin.revisions.columnPublished')}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((revision) => (
                <SmartRouterRevisionRow
                  key={revision.id}
                  revision={revision}
                  isSelected={revision.id === selectedRevisionId}
                  onSelect={onSelectRevision}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisions.pageOf', {
                current: meta.page,
                total: Math.max(meta.totalPages, 1),
              })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                {t('common.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
