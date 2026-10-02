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
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <div>
        <Button asChild size="sm" variant="ghost" className="touch:min-h-11 h-9">
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

      {/* PageHeader already carries the title and description; the section
          would otherwise repeat both and push the list below the fold. */}
      <ModelExposureSection connectorId={connectorId} showHeader={false} />
    </div>
  );
}
