import type { ReactElement } from 'react';

import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useTranslation } from '@/lib/i18n';

/** Every user with usage in the period. */
export function UsersPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <ObservabilityListPage
      kind="users"
      title={t('observabilityPages.titleUsers')}
      searchLabel={t('observabilityPages.searchUsers')}
      note={t('observabilityPages.noteUsers')}
      t={t}
    />
  );
}
