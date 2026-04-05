import { useCallback, useState } from 'react';

import type { Connector, CreateConnectorRequest, UpdateConnectorRequest } from '@/types';

import { useConnectors } from './use-connectors';
import { useCreateConnector } from './use-create-connector';
import { useDeleteConnector } from './use-delete-connector';
import { useSyncConnector } from './use-sync-connector';
import { useTestConnector } from './use-test-connector';
import { useUpdateConnector } from './use-update-connector';

export function useConnectorsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);

  const { connectors, total, isLoading, isError, error } = useConnectors();
  const { createConnector, isPending: isCreatePending } = useCreateConnector();
  const { updateConnector, isPending: isUpdatePending } = useUpdateConnector();
  const { deleteConnector, isPending: isDeletePending } = useDeleteConnector();
  const { testConnector, isPending: isTestPending } = useTestConnector();
  const { syncModels, isPending: isSyncPending } = useSyncConnector();

  const handleOpenCreate = useCallback(() => {
    setEditingConnector(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((connector: Connector) => {
    setEditingConnector(connector);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CreateConnectorRequest) => {
      if (editingConnector) {
        const updateData: UpdateConnectorRequest = { ...data };
        updateConnector(
          { id: editingConnector.id, data: updateData },
          { onSuccess: () => setIsFormOpen(false) },
        );
      } else {
        createConnector(data, { onSuccess: () => setIsFormOpen(false) });
      }
    },
    [editingConnector, updateConnector, createConnector],
  );

  return {
    connectors,
    total,
    isLoading,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    editingConnector,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    isFormPending: isCreatePending || isUpdatePending,
    deleteConnector,
    isDeletePending,
    testConnector,
    isTestPending,
    syncModels,
    isSyncPending,
  };
}
