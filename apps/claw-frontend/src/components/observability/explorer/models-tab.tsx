import type { ReactElement } from 'react';

import { LeaderboardSection } from '@/components/observability/explorer/leaderboard-section';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import type { ExplorerTabProps } from '@/types/observability-explorer.types';

/** AI usage by provider (one row per normalised provider) and by model. */
export function ModelsTab({ scope, t }: ExplorerTabProps): ReactElement {
  return (
    <div className="space-y-6">
      <LeaderboardSection
        scope={scope}
        t={t}
        dimension={UsageLeaderboardDimension.Provider}
        heading={t('observabilityExplorer.headingProviders')}
        firstColumnLabel={t('observabilityExplorer.colProvider')}
        showChart
      />
      <LeaderboardSection
        scope={scope}
        t={t}
        dimension={UsageLeaderboardDimension.Model}
        heading={t('usageAnalytics.modelsAllHeading')}
        firstColumnLabel={t('usageAnalytics.colModel')}
        showChart
      />
    </div>
  );
}
