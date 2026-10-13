import type { ReactElement } from 'react';

import { DetailPageFrame } from '@/components/observability/pages/detail-page-frame';
import { ROUTES } from '@/constants/routes.constants';
import { useObservabilityEntityDetail } from '@/hooks/observability/use-observability-entity-detail';
import { useTranslation } from '@/lib/i18n';
import type { ProviderDetailPageProps } from '@/types/observability-pages.types';

/** One provider for the period. The provider code comes from the route. */
export function ProviderDetailPage({ provider }: ProviderDetailPageProps): ReactElement {
  const { t } = useTranslation();
  const state = useObservabilityEntityDetail(provider, null);
  return (
    <DetailPageFrame
      detail={state.detail}
      isLoading={state.isLoading}
      isError={state.isError}
      onRetry={state.refetch}
      provider={provider}
      model={null}
      backHref={ROUTES.OBSERVABILITY_PROVIDERS}
      backLabel={t('observabilityPages.backToProviders')}
      t={t}
    />
  );
}
