import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HealthCheckResponse } from '@/types';
import { logger, showToast } from '@/utilities';

export function useTestConnector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'connectors', action: 'test-connector-start', message: 'Testing connector', details: { connectorId: id } });
      return connectorRepository.testConnector(id);
    },
    onSuccess: (_data: HealthCheckResponse, id: string) => {
      logger.info({ component: 'connectors', action: 'test-connector-success', message: 'Connector test passed', details: { connectorId: id } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(id),
      });
      showToast.success({ title: t('connectors.testSuccessful') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'test-connector-error', message: error.message });
      showToast.apiError(error, t('connectors.testFailed'));
    },
  });

  return {
    testConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data ?? null,
  };
}
