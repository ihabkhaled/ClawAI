import type { ReactElement } from 'react';

import { TracingTab } from '@/components/observability/explorer/tracing-tab';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useTranslation } from '@/lib/i18n';

/** The existing section, now its own page driven by the shared period and filters. */
export function TracingPage(): ReactElement {
  const { t } = useTranslation();
  const { scope } = useObservabilityScope();
  return <TracingTab scope={scope} t={t} />;
}
