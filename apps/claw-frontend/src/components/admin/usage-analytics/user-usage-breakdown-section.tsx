'use client';

import type { ReactElement } from 'react';

import { UsageRangePicker } from '@/components/admin/usage-analytics/usage-range-picker';
import { UsageToolsList } from '@/components/admin/usage-analytics/usage-tools-list';
import { UsageWorkflowsList } from '@/components/admin/usage-analytics/usage-workflows-list';
import { UserUsageCreditConnectorCard } from '@/components/admin/usage-analytics/user-usage-credit-connector-card';
import { UserUsageModelsTable } from '@/components/admin/usage-analytics/user-usage-models-table';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { USER_USAGE_PRESETS } from '@/constants/usage-analytics.constants';
import { useAdminUserUsageBreakdown } from '@/hooks/admin/use-admin-user-usage-breakdown';
import type { UserUsageBreakdownSectionProps } from '@/types/admin-usage-analytics.types';

/**
 * Models, tools and credit-connector use for one user, below the token cards.
 *
 * It owns its own query on purpose: this is a second request to a different
 * route, so a failure here shows a retry in THIS section and leaves the token
 * cards above it standing.
 */
export function UserUsageBreakdownSection({
  userId,
  t,
}: UserUsageBreakdownSectionProps): ReactElement {
  const { preset, setPreset, breakdown, isLoading, isError, refetch } =
    useAdminUserUsageBreakdown(userId);

  return (
    <section className="space-y-3" aria-labelledby="user-usage-breakdown-heading">
      <h3 id="user-usage-breakdown-heading" className="text-sm font-semibold">
        {t('usageAnalytics.breakdownHeading')}
      </h3>
      <UsageRangePicker presets={USER_USAGE_PRESETS} value={preset} onChange={setPreset} t={t} />

      {isLoading ? <LoadingSpinner label={t('usageAnalytics.loading')} /> : null}

      {isError || (!isLoading && breakdown === null) ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t('usageAnalytics.errorDescription')}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {breakdown === null || isError ? null : (
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t('usageAnalytics.modelsHeading')}</h4>
            <UserUsageModelsTable
              models={breakdown.models}
              truncated={breakdown.modelsTruncated}
              t={t}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UsageToolsList
              tools={breakdown.tools}
              toolCallCount={breakdown.toolCallCount}
              heading={t('usageAnalytics.toolsHeading')}
              t={t}
            />
            <UsageWorkflowsList
              workflows={breakdown.workflows}
              heading={t('usageAnalytics.workflowsHeading')}
            />
          </div>
          <UserUsageCreditConnectorCard credit={breakdown.creditConnector} t={t} />
        </div>
      )}
    </section>
  );
}
