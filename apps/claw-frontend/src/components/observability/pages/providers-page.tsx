import type { ReactElement } from 'react';

import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useTranslation } from '@/lib/i18n';

/** Every provider with usage in the period. */
export function ProvidersPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <ObservabilityListPage
      kind="providers"
      title={t('observabilityPages.titleProviders')}
      searchLabel={t('observabilityPages.searchProviders')}
      note={t('observabilityPages.noteProviders')}
      t={t}
    />
  );
}
