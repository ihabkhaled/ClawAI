'use client';

import { PageHeader } from '@/components/common/page-header';
import { ServiceStatusSection } from '@/components/observability/service-status-section';
import { UsageOverview } from '@/components/observability/usage-overview';
import { useObservabilityPage } from '@/hooks/observability/use-observability-page';
import { useServiceStatus } from '@/hooks/observability/use-service-status';
import { useTranslation } from '@/lib/i18n';

export default function ObservabilityPage() {
  const usage = useObservabilityPage();
  const serviceStatus = useServiceStatus();
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('observability.title')}
        description={t('observability.fullDescription')}
      />
      <ServiceStatusSection {...serviceStatus} />
      <UsageOverview {...usage} />
    </div>
  );
}
