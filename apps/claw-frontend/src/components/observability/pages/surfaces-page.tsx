import type { ReactElement } from 'react';

import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useTranslation } from '@/lib/i18n';

/** Usage per product surface (chat, compare, labs). */
export function SurfacesPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <ObservabilityListPage
      kind="workflows"
      title={t('observabilityPages.titleSurfaces')}
      searchLabel={t('observabilityPages.searchSurfaces')}
      note={t('observabilityPages.noteSurfaces')}
      t={t}
    />
  );
}
