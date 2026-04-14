'use client';

import { Plus, Plug } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { WorkspaceConnectorCard } from '@/components/workspace/workspace-connector-card';
import { useWorkspacePage } from '@/hooks/workspace/use-workspace-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspacePage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    connectors,
    isLoading,
    isError,
    error,
    handleDelete,
    handleHealthCheck,
    handleSync,
    isDeleting,
    isCheckingHealth,
    isSyncing,
    setIsCreateOpen,
  } = useWorkspacePage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('workspaceConnectors.title')}
          description={t('workspaceConnectors.description')}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('workspaceConnectors.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('workspaceConnectors.title')}
        description={t('workspaceConnectors.description')}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="me-2 size-4" />
            {t('workspaceConnectors.addConnector')}
          </Button>
        }
      />

      {isLoading && <LoadingSpinner label={t('workspaceConnectors.loadingConnectors')} />}

      {!isLoading && connectors.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Plug}
            title={t('workspaceConnectors.noConnectors')}
            description={t('workspaceConnectors.noConnectorsDesc')}
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="me-2 size-4" />
                {t('workspaceConnectors.addConnector')}
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && connectors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {connectors.map((connector) => (
            <WorkspaceConnectorCard
              key={connector.id}
              connector={connector}
              onDelete={handleDelete}
              onHealthCheck={handleHealthCheck}
              onSync={handleSync}
              isDeleting={isDeleting}
              isCheckingHealth={isCheckingHealth}
              isSyncing={isSyncing}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
