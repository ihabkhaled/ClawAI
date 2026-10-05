import type { ReactElement } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UsageSeriesChartProps } from '@/types/admin-usage-analytics.types';
import { barPercent, formatBucketLabel } from '@/utilities/usage-analytics.utility';

/**
 * Tokens per hour or day as stacked bars (input solid, output tinted).
 *
 * The bars are decoration for sighted users and are hidden from assistive tech;
 * the same numbers are in a real table beside them, so nothing depends on seeing
 * or hovering a bar. Bars are laid out start-to-end and flip with the page
 * direction, so Arabic and Persian read right to left like the rest of the UI.
 */
export function UsageSeriesChart({ series, grain, t }: UsageSeriesChartProps): ReactElement {
  if (series.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('usageAnalytics.seriesEmpty')}</p>;
  }
  const max = Math.max(...series.map((point) => point.inputTokens + point.outputTokens), 1);

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="bg-primary inline-block h-2 w-3 rounded-sm" />
          {t('usageAnalytics.seriesInput')}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="bg-primary/40 inline-block h-2 w-3 rounded-sm" />
          {t('usageAnalytics.seriesOutput')}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="flex h-40 items-end gap-px overflow-x-auto rounded-md border p-2"
      >
        {series.map((point) => {
          const total = point.inputTokens + point.outputTokens;
          const height = barPercent(total, max);
          const inputShare = total === 0 ? 0 : Math.round((point.inputTokens / total) * 100);
          return (
            <div
              key={point.bucketStart}
              title={`${formatBucketLabel(point.bucketStart, grain)}: ${total.toLocaleString()}`}
              className="flex min-w-1 flex-1 flex-col justify-end"
              style={{ height: `${height}%` }}
            >
              <div className="bg-primary/40 w-full" style={{ height: `${100 - inputShare}%` }} />
              <div className="bg-primary w-full" style={{ height: `${inputShare}%` }} />
            </div>
          );
        })}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium">
          {t('usageAnalytics.seriesAria', { count: series.length })}
        </summary>
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('usageAnalytics.colBucket')}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colInput')}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colOutput')}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colRequests')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((point) => (
                <TableRow key={point.bucketStart}>
                  <TableCell>{formatBucketLabel(point.bucketStart, grain)}</TableCell>
                  <TableCell className="text-end">{point.inputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-end">{point.outputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-end">{point.requests.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
