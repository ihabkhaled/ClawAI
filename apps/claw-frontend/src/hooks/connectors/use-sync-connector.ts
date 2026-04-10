import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { SyncModelsResponse } from '@/types';
import { logger, showToast } from '@/utilities';

export function useSyncConnector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'connectors', action: 'sync-models-start', message: 'Syncing connector models', details: { connectorId: id } });
      return connectorRepository.syncModels(id);
    },
    onSuccess: (_data: SyncModelsResponse, id: string) => {
      logger.info({ component: 'connectors', action: 'sync-models-success', message: 'Models synced successfully', details: { connectorId: id } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.models(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      showToast.success({ title: t('connectors.modelsSynced') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'sync-models-error', message: error.message });
      showToast.apiError(error, t('connectors.syncFailed'));
    },
  });

  return {
    syncModels: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data ?? null,
  };
}
