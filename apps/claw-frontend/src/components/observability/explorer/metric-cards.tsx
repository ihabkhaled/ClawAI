import type { ReactElement } from 'react';

import { CostKindBadge } from '@/components/observability/explorer/cost-kind-badge';
import { StatCard } from '@/components/observability/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type { MetricCardsProps } from '@/types/observability-explorer.types';
import { formatCount, formatUsd, totalTokens } from '@/utilities/observability-explorer.utility';

/**
 * Headline numbers for a period. Cost always carries its honesty badge, and an
 * unpriced total says so instead of printing "$0".
 */
export function MetricCards({ totals, t }: MetricCardsProps): ReactElement {
  const { cost } = totals;
  const priced = cost.costKind === UsageCostKind.Priced || cost.costKind === UsageCostKind.Fallback;
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="metric-cards"
    >
      <StatCard title={t('usageAnalytics.cardRequests')} value={formatCount(totals.requests)} />
      <StatCard
        title={t('usageAnalytics.cardTokens')}
        value={formatCount(totalTokens(totals))}
        description={t('usageAnalytics.cardTokensHint', {
          input: formatCount(totals.inputTokens),
          output: formatCount(totals.outputTokens),
        })}
      />
      <StatCard
        title={t('usageAnalytics.cardCost')}
        value={priced ? formatUsd(cost.costMicroUsd) : t('observabilityExplorer.costNotAvailable')}
        description={cost.partial ? t('observabilityExplorer.costPartial') : undefined}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('observabilityExplorer.cardCostQuality')}</CardDescription>
          <CardTitle className="text-2xl">
            <CostKindBadge kind={cost.costKind} partial={cost.partial} t={t} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            {t('observabilityExplorer.cardCostQualityHint', {
              priced: cost.pricedRequests,
              estimated: cost.estimatedRequests,
              unpriced: cost.unpricedRequests,
            })}
          </p>
        </CardContent>
      </Card>
      <StatCard
        title={t('observabilityExplorer.cardCreditRequests')}
        value={formatCount(totals.creditRequests)}
        description={formatUsd(totals.creditSpendMicroUsd)}
      />
      <StatCard
        title={t('observabilityExplorer.cardAllowanceRequests')}
        value={formatCount(totals.allowanceRequests)}
      />
      <StatCard
        title={t('observabilityExplorer.cardCachedTokens')}
        value={formatCount(totals.cachedTokens)}
      />
      <StatCard
        title={t('observabilityExplorer.cardToolCalls')}
        value={formatCount(totals.toolCalls)}
      />
    </div>
  );
}
