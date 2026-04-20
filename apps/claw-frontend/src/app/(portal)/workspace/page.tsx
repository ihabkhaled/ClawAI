'use client';

import { KeyRound, Package, Plug } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { WorkspaceConnectorCard } from '@/components/workspace/workspace-connector-card';
import { WorkspaceObjectList } from '@/components/workspace/workspace-object-list';
import { ROUTES } from '@/constants';
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
    selectedConnector,
    setSelectedConnector,
    objects,
    isObjectsLoading,
    isObjectsError,
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
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('workspaceConnectors.title')}
        description={t('workspaceConnectors.overviewDescription')}
        actions={
          <Button asChild>
            <Link href={ROUTES.WORKSPACE_APP_CONFIGS}>
              <KeyRound className="me-2 size-4" />
              {t('workspaceConnectors.manageAppConfigs')}
            </Link>
          </Button>
        }
      />

      {isLoading && <LoadingSpinner label={t('workspaceConnectors.loadingConnectors')} />}

      {!isLoading && connectors.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Plug}
            title={t('workspaceConnectors.noConnectors')}
            description={t('workspaceConnectors.noConnectorsGuidance')}
            action={
              <Button asChild>
                <Link href={ROUTES.WORKSPACE_APP_CONFIGS}>
                  <KeyRound className="me-2 size-4" />
                  {t('workspaceConnectors.goToAppConfigs')}
                </Link>
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

      {!isLoading && connectors.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              {selectedConnector !== null
                ? t('workspaceObjects.title')
                : t('workspaceObjects.selectConnector')}
            </h2>
          </div>
          {selectedConnector === null ? (
            <div className="flex flex-wrap items-center gap-2">
              {connectors.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedConnector(c)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setSelectedConnector(null)}
              >
                ← {t('common.back')}
              </Button>
              <WorkspaceObjectList
                objects={objects}
                isLoading={isObjectsLoading}
                isError={isObjectsError}
                t={t}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
