import type { ReactElement } from 'react';

import { AuditLatencyCard } from '@/components/observability/pages/audit-latency-card';
import { DetailCharts } from '@/components/observability/pages/detail-charts';
import { DetailKpis } from '@/components/observability/pages/detail-kpis';
import { DetailSplits } from '@/components/observability/pages/detail-splits';
import { HealthCard } from '@/components/observability/pages/health-card';
import type { EntityDetailViewProps } from '@/types/observability-pages.types';
import { entityName } from '@/utilities/observability-pages.utility';

/** One provider or one model: its numbers, charts, health, real latency and every split. */
export function EntityDetailView({
  detail,
  provider,
  model,
  sharedQuery,
  onOpenUser,
  t,
}: EntityDetailViewProps): ReactElement {
  return (
    <div className="min-w-0 space-y-6">
      <h2 className="text-xl font-semibold break-all">{entityName(detail.entity, t)}</h2>
      <DetailKpis detail={detail} t={t} />
      <DetailCharts detail={detail} t={t} />
      {detail.entity.health === null ? null : <HealthCard health={detail.entity.health} t={t} />}
      <AuditLatencyCard provider={provider} model={model} t={t} />
      <DetailSplits
        detail={detail}
        provider={provider}
        model={model}
        sharedQuery={sharedQuery}
        onOpenUser={onOpenUser}
        t={t}
      />
    </div>
  );
}
