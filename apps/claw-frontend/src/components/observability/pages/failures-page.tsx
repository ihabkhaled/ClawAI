import type { ReactElement } from 'react';

import { FailuresTab } from '@/components/observability/explorer/failures-tab';
import { QueryState } from '@/components/observability/explorer/query-state';
import { RefundedHoldsCard } from '@/components/observability/pages/refunded-holds-card';
import { useObservabilityHealth } from '@/hooks/observability/use-observability-health';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useTranslation } from '@/lib/i18n';

/**
 * Failures: the holds the billing ledger refunded, then the audit failures
 * grouped by action. The first is money, the second is errors; neither stands in
 * for the other.
 */
export function FailuresPage(): ReactElement {
  const { t } = useTranslation();
  const { scope } = useObservabilityScope();
  const health = useObservabilityHealth();

  return (
    <div className="min-w-0 space-y-6">
      <QueryState
        isLoading={health.isLoading}
        isError={health.isError}
        isEmpty={false}
        onRetry={health.refetch}
        t={t}
      >
        {health.report === null ? null : <RefundedHoldsCard report={health.report} t={t} />}
      </QueryState>
      <FailuresTab scope={scope} t={t} />
    </div>
  );
}
