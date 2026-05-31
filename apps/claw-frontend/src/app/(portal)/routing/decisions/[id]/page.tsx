'use client';

import { use } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { DecisionDetailSections } from '@/components/routing/decision-detail-sections';
import { useRoutingDecisionDetail } from '@/hooks/routing/use-routing-decision-detail';
import { useTranslation } from '@/lib/i18n';

export default function RoutingDecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { t } = useTranslation();
  const resolvedParams = use(params);
  const { decision, isLoading, isError } = useRoutingDecisionDetail(resolvedParams.id, true);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('decisionDetail.title')}
        description={t('decisionDetail.description')}
      />
      {isLoading ? <LoadingSpinner label={t('decisionDetail.loading')} /> : null}
      {isError ? (
        <p className="text-sm text-destructive">{t('decisionDetail.loadFailed')}</p>
      ) : null}
      {!isLoading && !isError && decision !== null ? (
        <DecisionDetailSections decision={decision} />
      ) : null}
    </div>
  );
}
