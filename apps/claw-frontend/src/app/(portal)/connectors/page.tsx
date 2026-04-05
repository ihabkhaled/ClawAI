'use client';

import { Plus, Plug } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ConnectorCard } from '@/components/connectors/connector-card';
import { ConnectorForm } from '@/components/connectors/connector-form';
import { Button } from '@/components/ui/button';
import { useConnectorsPage } from '@/hooks/connectors/use-connectors-page';
import { useTranslation } from '@/lib/i18n';
import type { Connector } from '@/types';

function ConnectorsContent({
  isLoading,
  connectors,
  handleOpenCreate,
  testConnector,
  syncModels,
  handleOpenEdit,
  deleteConnector,
  isTestPending,
  isSyncPending,
}: {
  isLoading: boolean;
  connectors: Connector[];
  handleOpenCreate: () => void;
  testConnector: (id: string) => void;
  syncModels: (id: string) => void;
  handleOpenEdit: (connector: Connector) => void;
  deleteConnector: (id: string) => void;
  isTestPending: boolean;
  isSyncPending: boolean;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading connectors..." />;
  }

  if (connectors.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title="No connectors configured"
        description="Connect to AI providers like OpenAI, Anthropic, Google, or your local Ollama instance to start orchestrating models."
        action={
          <Button onClick={handleOpenCreate}>
            <Plus className="me-2 h-4 w-4" />
            Add Connector
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.id}
          connector={connector}
          onTest={testConnector}
          onSync={syncModels}
          onEdit={handleOpenEdit}
          onDelete={deleteConnector}
          isTestPending={isTestPending}
          isSyncPending={isSyncPending}
        />
      ))}
    </div>
  );
}

export default function ConnectorsPage() {
  const {
    connectors,
    isLoading,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    editingConnector,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    isFormPending,
    deleteConnector,
    testConnector,
    isTestPending,
    syncModels,
    isSyncPending,
  } = useConnectorsPage();

  const { t } = useTranslation();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('connectors.title')} description={t('connectors.description')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? 'Failed to load connectors.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('connectors.title')}
        description={t('connectors.description')}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="me-2 h-4 w-4" />
            Add Connector
          </Button>
        }
      />

      <ConnectorsContent
        isLoading={isLoading}
        connectors={connectors}
        handleOpenCreate={handleOpenCreate}
        testConnector={testConnector}
        syncModels={syncModels}
        handleOpenEdit={handleOpenEdit}
        deleteConnector={deleteConnector}
        isTestPending={isTestPending}
        isSyncPending={isSyncPending}
      />

      <ConnectorForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        connector={editingConnector}
      />
    </div>
  );
}
