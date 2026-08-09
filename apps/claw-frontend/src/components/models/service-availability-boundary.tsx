'use client';

import { ServerOff } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyStateVariant, OptionalService } from '@/enums';
import { useServiceAvailability } from '@/hooks/health/use-service-availability';
import { useTranslation } from '@/lib/i18n';
import type { ServiceAvailabilityBoundaryProps } from '@/types';
import { readServiceAvailability } from '@/utilities/service-availability.utility';

export function ServiceAvailabilityBoundary({
  service,
  children,
}: ServiceAvailabilityBoundaryProps): React.ReactElement {
  const { health, isLoading } = useServiceAvailability();
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingState label={t('models.serviceUnavailable.checking')} />;
  }

  if (!readServiceAvailability(health, service)) {
    const descriptionKey =
      service === OptionalService.OLLAMA
        ? 'models.serviceUnavailable.ollamaDescription'
        : 'models.serviceUnavailable.llamacppDescription';
    return (
      <EmptyState
        icon={ServerOff}
        title={t('models.serviceUnavailable.title')}
        description={t(descriptionKey)}
        variant={EmptyStateVariant.Page}
      />
    );
  }

  return <>{children}</>;
}
