import { LoadingSpinner } from '@/components/common/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VersionDiffStatus } from '@/enums';
import type { SmartRouterCompareTabProps } from '@/types/smart-router-admin.types';

import { SmartRouterCompareDiffRow } from './smart-router-compare-diff-row';

export function SmartRouterCompareTab({
  revisions,
  fromId,
  toId,
  onFromChange,
  onToChange,
  diff,
  isLoading,
  t,
}: SmartRouterCompareTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="smart-router-compare-from" className="text-sm font-medium">
            {t('smartRouterAdmin.compare.fromLabel')}
          </label>
          <Select
            value={fromId ?? undefined}
            onValueChange={(value: string) => onFromChange(value)}
          >
            <SelectTrigger id="smart-router-compare-from">
              <SelectValue placeholder={t('smartRouterAdmin.compare.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {revisions.map((revision) => (
                <SelectItem key={revision.id} value={revision.id}>
                  #{revision.revision}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="smart-router-compare-to" className="text-sm font-medium">
            {t('smartRouterAdmin.compare.toLabel')}
          </label>
          <Select value={toId ?? undefined} onValueChange={(value: string) => onToChange(value)}>
            <SelectTrigger id="smart-router-compare-to">
              <SelectValue placeholder={t('smartRouterAdmin.compare.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {revisions.map((revision) => (
                <SelectItem key={revision.id} value={revision.id}>
                  #{revision.revision}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

      {!isLoading && diff === null ? (
        <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.compare.noSelection')}</p>
      ) : null}

      {!isLoading &&
      diff !== null &&
      diff.entries.every((entry) => entry.status === VersionDiffStatus.UNCHANGED) ? (
        <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.compare.noChanges')}</p>
      ) : null}

      {!isLoading &&
      diff !== null &&
      !diff.entries.every((entry) => entry.status === VersionDiffStatus.UNCHANGED) ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16" />
              <TableHead>{t('smartRouterAdmin.revisions.columnStatus')}</TableHead>
              <TableHead>{t('smartRouterAdmin.entryForm.modelAlias')}</TableHead>
              <TableHead>{t('smartRouterAdmin.compare.changedFieldsLabel')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diff.entries.map((entry) => (
              <SmartRouterCompareDiffRow key={entry.order} diffItem={entry} t={t} />
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
