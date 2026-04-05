import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UpdateConnectorParams } from '@/types';
import { showToast } from '@/utilities';

export function useUpdateConnector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateConnectorParams) =>
      connectorRepository.updateConnector(id, data),
    onSuccess: (connector) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(connector.id),
      });
      showToast.success({ title: t('connectors.connectorUpdated') });
    },
    onError: (error: Error) => {
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
