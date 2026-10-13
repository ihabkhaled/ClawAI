import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { HealthCardProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';
import { formatRatioPercent, formatSettle } from '@/utilities/observability-pages.utility';

/**
 * Holds that settled versus holds that were released before billing. It says in
 * plain words what it is NOT: an HTTP success rate, or provider latency. Real
 * latency and error codes are on the Tracing and Failures pages.
 */
export function HealthCard({ health, t }: HealthCardProps): ReactElement {
  const rows: Array<[string, string]> = [
    [t('observabilityPages.healthSettled'), formatCount(health.finalized)],
    [t('observabilityPages.healthReleased'), formatCount(health.released)],
    [t('observabilityPages.healthInFlight'), formatCount(health.inFlight)],
    [t('observabilityPages.healthStale'), formatCount(health.staleReserved)],
    [t('observabilityPages.colSettleRate'), formatRatioPercent(health.settleRate)],
    [t('observabilityPages.colRefundRate'), formatRatioPercent(health.refundRate)],
    [t('observabilityPages.healthSettleAvg'), formatSettle(health.avgSettleMs)],
    [t('observabilityPages.healthSettleP50'), formatSettle(health.p50SettleMs)],
    [t('observabilityPages.colSettleP95'), formatSettle(health.p95SettleMs)],
  ];
  return (
    <Card data-testid="health-card">
      <CardHeader>
        <CardTitle className="text-base">{t('observabilityPages.healthTitle')}</CardTitle>
        <CardDescription>{t('observabilityPages.healthNote')}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b py-1">
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {health.staleReserved > 0 ? (
          <p role="status" className="text-muted-foreground mt-3 text-xs">
            {t('observabilityPages.healthStaleHint', { count: formatCount(health.staleReserved) })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
