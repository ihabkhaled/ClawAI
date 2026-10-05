'use client';

import { BarChart3 } from 'lucide-react';
import type { ReactElement } from 'react';

import { UsageToolsList } from '@/components/admin/usage-analytics/usage-tools-list';
import { UsageWorkflowsList } from '@/components/admin/usage-analytics/usage-workflows-list';
import { UserUsageModelsTable } from '@/components/admin/usage-analytics/user-usage-models-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { UsageAnalyticsFilters } from '@/components/observability/usage-analytics/usage-analytics-filters';
import { UsageAnalyticsSummary } from '@/components/observability/usage-analytics/usage-analytics-summary';
import { UsageSeriesChart } from '@/components/observability/usage-analytics/usage-series-chart';
import { UsageTopUsersTable } from '@/components/observability/usage-analytics/usage-top-users-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageAnalytics } from '@/hooks/observability/use-usage-analytics';
import { useTranslation } from '@/lib/i18n';

/**
 * Admin "Platform usage" on /observability: tokens over time, USD consumed
 * today, models, top users and top tools, with period and user filters.
 *
 * Rendered only for an actor holding ADMIN_USAGE_VIEW (the endpoint's own
 * permission); everyone else sees the page exactly as before. The server still
 * enforces it, so this is a courtesy, not the control.
 */
export function UsageAnalyticsSection(): ReactElement | null {
  const { t } = useTranslation();
  const state = useUsageAnalytics();
  const { analytics } = state;

  if (!state.canView) {
    return null;
  }

  return (
    <section className="mb-8 space-y-4" aria-labelledby="usage-analytics-heading">
      <div>
        <h2 id="usage-analytics-heading" className="text-lg font-semibold">
          {t('usageAnalytics.sectionTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('usageAnalytics.sectionDescription')}</p>
      </div>

      <UsageAnalyticsFilters state={state} t={t} />

      {state.isLoading ? <LoadingSpinner label={t('usageAnalytics.loading')} /> : null}

      {state.isError ? (
        <EmptyState
          icon={BarChart3}
          title={t('usageAnalytics.errorTitle')}
          description={t('usageAnalytics.errorDescription')}
          action={
            <Button variant="outline" size="sm" onClick={state.refetch}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {analytics === null || state.isError ? null : (
        <div className="space-y-6">
          <p className="text-muted-foreground text-xs">
            {t('usageAnalytics.rangeSummary', {
              from: analytics.from.slice(0, 16).replace('T', ' '),
              to: analytics.to.slice(0, 16).replace('T', ' '),
              grain:
                analytics.grain === 'HOUR'
                  ? t('usageAnalytics.grainHour')
                  : t('usageAnalytics.grainDay'),
            })}
            {analytics.userId === null
              ? null
              : ` ${t('usageAnalytics.userFiltered', { user: analytics.userId })}`}
          </p>
          <UsageAnalyticsSummary analytics={analytics} t={t} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('usageAnalytics.seriesHeading')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageSeriesChart series={analytics.series} grain={analytics.grain} t={t} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('usageAnalytics.modelsAllHeading')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UserUsageModelsTable models={analytics.models} truncated={false} t={t} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {analytics.userId === null ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('usageAnalytics.topUsersHeading')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsageTopUsersTable users={analytics.topUsers} t={t} />
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardContent className="space-y-6 pt-6">
                <UsageToolsList
                  tools={analytics.tools}
                  heading={t('usageAnalytics.topToolsHeading')}
                  t={t}
                />
                <UsageWorkflowsList
                  workflows={analytics.workflows}
                  heading={t('usageAnalytics.workflowsHeading')}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
