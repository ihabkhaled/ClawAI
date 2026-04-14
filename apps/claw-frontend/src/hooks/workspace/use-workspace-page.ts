import { useState } from 'react';

import type { WorkspaceConnector } from '../../types/workspace.types';

import {
  useDeleteWorkspaceConnector,
  useTestWorkspaceConnectorHealth,
  useTriggerWorkspaceSync,
} from './use-workspace-connector-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';

export function useWorkspacePage() {
  const [selectedConnector, setSelectedConnector] = useState<WorkspaceConnector | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, isError, error } = useWorkspaceConnectors();
  const deleteMutation = useDeleteWorkspaceConnector();
  const healthMutation = useTestWorkspaceConnectorHealth();
  const syncMutation = useTriggerWorkspaceSync();

  const connectors = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleHealthCheck = (id: string) => healthMutation.mutate(id);
  const handleSync = (id: string) => syncMutation.mutate({ id });

  return {
    connectors,
    total,
    isLoading,
    isError,
    error,
    selectedConnector,
    setSelectedConnector,
    isCreateOpen,
    setIsCreateOpen,
    handleDelete,
    handleHealthCheck,
    handleSync,
    isDeleting: deleteMutation.isPending,
    isCheckingHealth: healthMutation.isPending,
    isSyncing: syncMutation.isPending,
  };
}
