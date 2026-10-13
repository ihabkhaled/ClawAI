import type { ReactElement } from 'react';

import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useTranslation } from '@/lib/i18n';

/** Every model with usage in the period. */
export function ModelsPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <ObservabilityListPage
      kind="models"
      title={t('observabilityPages.titleModels')}
      searchLabel={t('observabilityPages.searchModels')}
      note={t('observabilityPages.noteModels')}
      t={t}
    />
  );
}
