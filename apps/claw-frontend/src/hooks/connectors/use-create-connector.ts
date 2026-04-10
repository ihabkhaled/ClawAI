import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateConnectorRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useCreateConnector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: CreateConnectorRequest) => connectorRepository.createConnector(data),
    onSuccess: () => {
      logger.info({ component: 'connectors', action: 'create-connector', message: 'Connector created' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      showToast.success({ title: t('connectors.connectorCreated') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'create-connector-error', message: error.message });
      showToast.apiError(error, t('connectors.connectorCreateFailed'));
    },
  });

  return {
    createConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
