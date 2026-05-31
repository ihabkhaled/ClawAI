'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ConnectorGrantsCard } from '@/components/connector-grants/connector-grants-card';
import { Button } from '@/components/ui/button';
import { ConnectorDetailView } from '@/components/workspace/connector-detail-view';
import { useConnectorDetailPage } from '@/hooks/workspace/use-connector-detail-page';

export default function WorkspaceConnectorDetailPage(): React.ReactElement {
  const ctrl = useConnectorDetailPage();

  return (
    <div className="space-y-6">
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

      {ctrl.isActivating ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          <Loader2 className="size-4 animate-spin" />
          <span>{ctrl.t('connectorDetail.activating')}</span>
        </div>
      ) : null}

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}

      {ctrl.isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {ctrl.error instanceof Error ? ctrl.error.message : ctrl.t('connectorDetail.loadFailed')}
        </div>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.connector !== undefined ? (
        <>
          <ConnectorDetailView
            connector={ctrl.connector}
            syncRuns={ctrl.syncRuns}
            healthEvents={ctrl.healthEvents}
            recentObjects={ctrl.recentObjects}
            isSyncing={ctrl.isSyncing}
            isCheckingHealth={ctrl.isCheckingHealth}
            isDeleting={ctrl.isDeleting}
            isAskingAi={ctrl.isAskingAi}
            onSync={ctrl.onSync}
            onHealthCheck={ctrl.onHealthCheck}
            onDelete={ctrl.onDelete}
            onAskAi={ctrl.onAskAi}
            t={ctrl.t}
          />
          <ConnectorGrantsCard
            connectorId={ctrl.connector.id}
            labels={{
              title: ctrl.t('connectorGrants.title'),
              description: ctrl.t('connectorGrants.description'),
              loading: ctrl.t('connectorGrants.loading'),
              error: ctrl.t('connectorGrants.error'),
              empty: ctrl.t('connectorGrants.empty'),
              granteeUserIdLabel: ctrl.t('connectorGrants.granteeUserIdLabel'),
              granteeUserIdPlaceholder: ctrl.t('connectorGrants.granteeUserIdPlaceholder'),
              accessLevelLabel: ctrl.t('connectorGrants.accessLevelLabel'),
              grant: ctrl.t('connectorGrants.grant'),
              granting: ctrl.t('connectorGrants.granting'),
              revoke: ctrl.t('connectorGrants.revoke'),
              revoking: ctrl.t('connectorGrants.revoking'),
              grantedBy: ctrl.t('connectorGrants.grantedBy'),
              levelReadOnly: ctrl.t('connectorGrants.levelReadOnly'),
              levelAiActions: ctrl.t('connectorGrants.levelAiActions'),
              levelFull: ctrl.t('connectorGrants.levelFull'),
            }}
          />
        </>
      ) : null}
    </div>
  );
}
