'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ModelExposureSection } from '@/components/admin/connectors/model-exposure-section';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export default function ConnectorModelExposurePage() {
  const params = useParams<{ connectorId: string }>();
  const connectorId = params.connectorId ?? '';
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <Button asChild size="sm" variant="ghost" className="h-8">
          <Link href={ROUTES.CONNECTOR_DETAIL(connectorId)}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
            {t('connectors.backToConnector')}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={t('adminConnectors.exposure.title')}
        description={t('adminConnectors.exposure.description')}
      />

      <ModelExposureSection connectorId={connectorId} />
    </div>
  );
}
