'use client';

import { PageHeader } from '@/components/common/page-header';
import { ObservabilityContent } from '@/components/observability/observability-content';
import { OpenGrafanaButton } from '@/components/observability/open-grafana-button';
import { useTranslation } from '@/lib/i18n';

export default function ObservabilityPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('observability.title')}
        description={t('observability.fullDescription')}
        actions={<OpenGrafanaButton />}
      />
      <ObservabilityContent />
    </div>
  );
}
