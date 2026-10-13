import type { ReactElement } from 'react';

import { ConsumptionTab } from '@/components/observability/explorer/consumption-tab';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useTranslation } from '@/lib/i18n';

/** The existing section, now its own page driven by the shared period and filters. */
export function ConsumptionPage(): ReactElement {
  const { t } = useTranslation();
  const { scope } = useObservabilityScope();
  return <ConsumptionTab scope={scope} t={t} />;
}
