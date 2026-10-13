import type { ReactElement } from 'react';

import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useTranslation } from '@/lib/i18n';

/** Usage per plan, including requests with no plan. */
export function PlansPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <ObservabilityListPage
      kind="plans"
      title={t('observabilityPages.titlePlans')}
      searchLabel={t('observabilityPages.searchPlans')}
      note={t('observabilityPages.notePlans')}
      t={t}
    />
  );
}
