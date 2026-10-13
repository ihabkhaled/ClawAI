import type { ReactElement } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntityAuditLatency } from '@/hooks/observability/use-entity-audit-latency';
import type { AuditLatencyCardProps } from '@/types/observability-pages.types';
import { formatCount, formatLatency, formatRate } from '@/utilities/observability-explorer.utility';

/**
 * Real latency and failure signals from the audit service. This is the answer
 * to "how fast is it"; the settle time on the cards above is reserve to settle,
 * not provider latency. A period over 30 days is clamped, and says so.
 */
export function AuditLatencyCard({ provider, model, t }: AuditLatencyCardProps): ReactElement {
  const latency = useEntityAuditLatency(provider, model);
  const { match } = latency;
  const rows: Array<[string, string]> =
    match === null
      ? []
      : [
          [t('observabilityPages.auditMeasured'), formatCount(match.measuredRequests)],
          [t('observabilityPages.auditAvg'), formatLatency(match.avgLatencyMs)],
          [t('observabilityPages.auditP50'), formatLatency(match.p50LatencyMs)],
          [t('observabilityPages.auditP95'), formatLatency(match.p95LatencyMs)],
          [
            t('observabilityPages.auditFailures'),
            match.failureEvents === null ? '-' : formatCount(match.failureEvents),
          ],
          [t('observabilityPages.auditErrorRate'), formatRate(match.errorRate)],
        ];

  return (
    <Card data-testid="audit-latency-card">
      <CardHeader>
        <CardTitle className="text-base">{t('observabilityPages.auditTitle')}</CardTitle>
        <CardDescription>{t('observabilityPages.auditNote')}</CardDescription>
      </CardHeader>
      <CardContent>
        {latency.isLoading ? <LoadingSpinner label={t('usageAnalytics.loading')} /> : null}
        {latency.isError ? (
          <p role="alert" className="text-muted-foreground text-sm">
            {t('observabilityPages.auditUnavailable')}
          </p>
        ) : null}
        {!latency.isLoading && !latency.isError && match === null ? (
          <p className="text-muted-foreground text-sm">{t('observabilityPages.auditNone')}</p>
        ) : null}
        {rows.length > 0 ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b py-1">
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {latency.clamped ? (
          <p role="status" className="text-muted-foreground mt-3 text-xs">
            {t('observabilityPages.auditClamped')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
