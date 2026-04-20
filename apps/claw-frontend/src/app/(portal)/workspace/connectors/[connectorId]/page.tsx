'use client';

import { ArrowLeft } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ConnectorDetailView } from '@/components/workspace/connector-detail-view';
import { useConnectorDetailPage } from '@/hooks/workspace/use-connector-detail-page';

export default function WorkspaceConnectorDetailPage(): React.ReactElement {
  const ctrl = useConnectorDetailPage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={ctrl.t('connectorDetail.title')}
        description={ctrl.t('connectorDetail.description')}
        actions={
          <Button variant="outline" size="sm" onClick={ctrl.onBack}>
            <ArrowLeft className="me-2 size-4" />
            {ctrl.t('common.back')}
          </Button>
        }
      />

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}

      {ctrl.isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {ctrl.error instanceof Error ? ctrl.error.message : ctrl.t('connectorDetail.loadFailed')}
        </div>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.connector !== undefined ? (
        <ConnectorDetailView
          connector={ctrl.connector}
          syncRuns={ctrl.syncRuns}
          healthEvents={ctrl.healthEvents}
          recentObjects={ctrl.recentObjects}
          isSyncing={ctrl.isSyncing}
          isCheckingHealth={ctrl.isCheckingHealth}
          isDeleting={ctrl.isDeleting}
          onSync={ctrl.onSync}
          onHealthCheck={ctrl.onHealthCheck}
          onDelete={ctrl.onDelete}
          t={ctrl.t}
        />
      ) : null}
    </div>
  );
}
