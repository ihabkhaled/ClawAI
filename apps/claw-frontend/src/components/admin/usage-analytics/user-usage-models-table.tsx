import type { ReactElement } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserUsageModelsTableProps } from '@/types/admin-usage-analytics.types';
import { formatMicroUsd } from '@/utilities/billing-dashboard.utility';

/**
 * Every model the user called, under the provider/connector it went through.
 * Provider codes and model ids are identifiers, never translated. Cost is a
 * decimal string rendered with BigInt maths, never a float.
 */
export function UserUsageModelsTable({
  models,
  truncated,
  t,
}: UserUsageModelsTableProps): ReactElement {
  if (models.length === 0) {
    return <p className="text-muted-foreground text-xs">{t('usageAnalytics.modelsEmpty')}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('usageAnalytics.colModel')}</TableHead>
              <TableHead>{t('usageAnalytics.colConnector')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colRequests')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colInput')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colOutput')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colCost')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colCredit')}</TableHead>
              <TableHead className="text-end">{t('usageAnalytics.colFree')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((line) => (
              <TableRow key={`${line.provider}:${line.model}`}>
                <TableCell className="font-medium break-all">{line.model}</TableCell>
                <TableCell>{line.provider}</TableCell>
                <TableCell className="text-end">{line.requests.toLocaleString()}</TableCell>
                <TableCell className="text-end">{line.inputTokens.toLocaleString()}</TableCell>
                <TableCell className="text-end">{line.outputTokens.toLocaleString()}</TableCell>
                <TableCell className="text-end whitespace-nowrap">
                  {formatMicroUsd(line.costMicroUsd)}
                </TableCell>
                <TableCell className="text-end">{line.creditRequests.toLocaleString()}</TableCell>
                <TableCell className="text-end">
                  {line.freeAllowanceRequests.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {truncated ? (
        <p className="text-muted-foreground text-xs">
          {t('usageAnalytics.modelsTruncated', { count: models.length })}
        </p>
      ) : null}
    </div>
  );
}
