"use client";

import { Plus, Plug } from "lucide-react";

import { ConnectorCard } from "@/components/connectors/connector-card";
import { ConnectorForm } from "@/components/connectors/connector-form";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { useConnectorsPage } from "@/hooks/connectors/use-connectors-page";

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

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Connectors"
          description="Manage your AI provider connections"
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to load connectors."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Connectors"
        description="Manage your AI provider connections"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Connector
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner label="Loading connectors..." />
      ) : connectors.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No connectors configured"
          description="Connect to AI providers like OpenAI, Anthropic, Google, or your local Ollama instance to start orchestrating models."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connector
            </Button>
          }
        />
      ) : (
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
      )}

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
