import type { ReactElement } from 'react';

import { ServiceStatusSection } from '@/components/observability/service-status-section';
import { UsageOverview } from '@/components/observability/usage-overview';
import { useObservabilityPage } from '@/hooks/observability/use-observability-page';
import { useServiceStatus } from '@/hooks/observability/use-service-status';

/** The page as it was, for an actor without ADMIN_USAGE_VIEW: service health and the all-time summary. */
export function LegacyObservability(): ReactElement {
  const usage = useObservabilityPage();
  const serviceStatus = useServiceStatus();

  return (
    <div>
      <ServiceStatusSection {...serviceStatus} />
      <UsageOverview {...usage} />
    </div>
  );
}
