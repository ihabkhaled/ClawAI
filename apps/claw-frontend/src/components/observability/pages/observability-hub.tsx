import type { ReactElement } from 'react';

import { QueryState } from '@/components/observability/explorer/query-state';
import { HealthCard } from '@/components/observability/pages/health-card';
import { KpiGrid } from '@/components/observability/pages/kpi-grid';
import { OverviewCharts } from '@/components/observability/pages/overview-charts';
import { PreviewSection } from '@/components/observability/pages/preview-section';
import { TopSizePicker } from '@/components/observability/pages/top-size-picker';
import { ServiceStatusSection } from '@/components/observability/service-status-section';
import { ROUTES } from '@/constants/routes.constants';
import { useObservabilityOverview } from '@/hooks/observability/use-observability-overview';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useServiceStatus } from '@/hooks/observability/use-service-status';
import { useTranslation } from '@/lib/i18n';
import { formatTimestamp } from '@/utilities/observability-explorer.utility';
import { withQuery } from '@/utilities/observability-url.utility';

/**
 * The landing page: service status, the period's numbers against the previous
 * period, activity charts, and a preview of each full list with "View all N".
 * Nothing here is a hidden top-5: the preview size is chosen and the totals shown.
 */
export function ObservabilityHub(): ReactElement {
  const { t } = useTranslation();
  const serviceStatus = useServiceStatus();
  const { sharedQuery, openUser } = useObservabilityScope();
  const { overview, top, setTop, isLoading, isError, refetch } = useObservabilityOverview();
  const link = (href: string): string => withQuery(href, sharedQuery);

  return (
    <div className="min-w-0 space-y-6">
      <ServiceStatusSection {...serviceStatus} />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={overview !== null && overview.totals.metrics.requests === 0}
        onRetry={refetch}
        t={t}
      >
        {overview === null ? null : (
          <div className="space-y-6">
            <p className="text-muted-foreground text-xs">
              {t('observabilityPages.rangeSummary', {
                from: formatTimestamp(overview.from),
                to: formatTimestamp(overview.to),
                previousFrom: formatTimestamp(overview.previousFrom),
                previousTo: formatTimestamp(overview.previousTo),
              })}
            </p>
            <KpiGrid overview={overview} t={t} />
            <OverviewCharts overview={overview} t={t} />
            <HealthCard health={overview.health} t={t} />
          </div>
        )}
      </QueryState>

      <TopSizePicker value={top} onChange={setTop} t={t} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PreviewSection
          kind="users"
          title={t('observabilityPages.titleUsers')}
          top={top}
          viewAllHref={link(ROUTES.OBSERVABILITY_USERS)}
          viewAllLabel={t('observabilityPages.viewAll')}
          onOpenUser={openUser}
          sharedQuery={sharedQuery}
          t={t}
        />
        <PreviewSection
          kind="models"
          title={t('observabilityPages.titleModels')}
          top={top}
          viewAllHref={link(ROUTES.OBSERVABILITY_MODELS)}
          viewAllLabel={t('observabilityPages.viewAll')}
          onOpenUser={openUser}
          sharedQuery={sharedQuery}
          t={t}
        />
        <PreviewSection
          kind="providers"
          title={t('observabilityPages.titleProviders')}
          top={top}
          viewAllHref={link(ROUTES.OBSERVABILITY_PROVIDERS)}
          viewAllLabel={t('observabilityPages.viewAll')}
          onOpenUser={openUser}
          sharedQuery={sharedQuery}
          t={t}
        />
        <PreviewSection
          kind="plans"
          title={t('observabilityPages.titlePlans')}
          top={top}
          viewAllHref={link(ROUTES.OBSERVABILITY_PLANS)}
          viewAllLabel={t('observabilityPages.viewAll')}
          onOpenUser={openUser}
          sharedQuery={sharedQuery}
          t={t}
        />
      </div>
    </div>
  );
}
