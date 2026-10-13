import type { ReactElement } from 'react';

import { DetailPageFrame } from '@/components/observability/pages/detail-page-frame';
import { ROUTES } from '@/constants/routes.constants';
import { useObservabilityEntityDetail } from '@/hooks/observability/use-observability-entity-detail';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useTranslation } from '@/lib/i18n';

/**
 * One model for the period. A model id contains "/" and ":", so the provider and
 * the model come from the query string (`?provider=&model=`), not the path.
 */
export function ModelDetailPage(): ReactElement {
  const { t } = useTranslation();
  const { param } = useObservabilityScope();
  const provider = param('provider');
  const model = param('model');
  const state = useObservabilityEntityDetail(provider, model);
  return (
    <DetailPageFrame
      detail={state.detail}
      isLoading={state.isLoading}
      isError={state.isError}
      onRetry={state.refetch}
      provider={provider}
      model={model}
      backHref={ROUTES.OBSERVABILITY_MODELS}
      backLabel={t('observabilityPages.backToModels')}
      t={t}
    />
  );
}
