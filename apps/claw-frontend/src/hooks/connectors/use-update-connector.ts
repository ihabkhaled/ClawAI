import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateConnectorParams } from '@/types';
import { logger, showToast } from '@/utilities';

export function useUpdateConnector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateConnectorParams) => {
      logger.info({ component: 'connectors', action: 'update-connector', message: 'Updating connector', details: { connectorId: id } });
      return connectorRepository.updateConnector(id, data);
    },
    onSuccess: (connector) => {
      logger.info({ component: 'connectors', action: 'update-connector-success', message: 'Connector updated', details: { connectorId: connector.id } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(connector.id),
      });
      showToast.success({ title: t('connectors.connectorUpdated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'update-connector-error', message: error.message });
      showToast.apiError(error, t('connectors.connectorUpdateFailed'));
    },
  });

  return {
    updateConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
