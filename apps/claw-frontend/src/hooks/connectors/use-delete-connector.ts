import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeleteConnector() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'connectors', action: 'delete-connector', message: 'Deleting connector', details: { connectorId: id } });
      return connectorRepository.deleteConnector(id);
    },
    onSuccess: () => {
      logger.info({ component: 'connectors', action: 'delete-connector-success', message: 'Connector deleted' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      router.push(ROUTES.CONNECTORS);
      showToast.success({ title: t('connectors.connectorDeleted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'delete-connector-error', message: error.message });
      showToast.apiError(error, t('connectors.connectorDeleteFailed'));
    },
  });

  return {
    deleteConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
