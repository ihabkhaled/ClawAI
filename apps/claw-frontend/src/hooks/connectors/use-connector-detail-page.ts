import { useCallback, useState } from 'react';

import type { Connector, CreateConnectorRequest, UpdateConnectorRequest } from '@/types';

import { useConnectorDetail } from './use-connector-detail';
import { useDeleteConnector } from './use-delete-connector';
import { useSyncConnector } from './use-sync-connector';
import { useTestConnector } from './use-test-connector';
import { useUpdateConnector } from './use-update-connector';

export function useConnectorDetailPage(connectorId: string) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { connector, models, isLoadingConnector, isLoadingModels, isError, error } =
    useConnectorDetail(connectorId);

  const { updateConnector, isPending: isUpdatePending } = useUpdateConnector();
  const { deleteConnector, isPending: isDeletePending } = useDeleteConnector();
  const { testConnector, isPending: isTestPending, data: testResult } = useTestConnector();
  const { syncModels, isPending: isSyncPending, data: syncResult } = useSyncConnector();

  const handleOpenEdit = useCallback(() => {
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CreateConnectorRequest) => {
      if (!connector) {
        return;
      }
      const updateData: UpdateConnectorRequest = { ...data };
      updateConnector(
        { id: connector.id, data: updateData },
        { onSuccess: () => setIsFormOpen(false) },
      );
    },
    [connector, updateConnector],
  );

  const handleToggleEnabled = useCallback(
    (connector: Connector) => {
      updateConnector({
        id: connector.id,
        data: { isEnabled: !connector.isEnabled },
      });
    },
    [updateConnector],
  );

  return {
    connector,
    models,
    isLoadingConnector,
    isLoadingModels,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    handleOpenEdit,
    handleFormSubmit,
    isFormPending: isUpdatePending,
    deleteConnector,
    isDeletePending,
    testConnector,
    isTestPending,
    testResult,
    syncModels,
    isSyncPending,
    syncResult,
    handleToggleEnabled,
  };
}
