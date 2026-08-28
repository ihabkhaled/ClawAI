import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ConnectorStatus } from '@/enums';
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
      logger.info({
        component: 'connectors',
        action: 'test-connector-start',
        message: 'Testing connector',
        details: { connectorId: id },
      });
      return connectorRepository.testConnector(id);
    },
    // A reachable endpoint and a working connector are not the same thing. The
    // probe answers HTTP 200 whatever the provider said, carrying the verdict in
    // `status`, so treating the 200 as the verdict reported success for a
    // connector the backend had just marked DOWN — and the real failure only
    // surfaced later, as a 500 on Sync Models.
    onSuccess: (data: HealthCheckResponse, id: string) => {
      const isDown = data.status === ConnectorStatus.DOWN;
      logger.info({
        component: 'connectors',
        action: 'test-connector-success',
        message: 'Connector test completed',
        details: { connectorId: id, status: data.status },
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.detail(id),
      });

      if (isDown) {
        showToast.error({ title: t('connectors.testFailed'), description: data.errorMessage });
        return;
      }

      showToast.success({ title: t('connectors.testSuccessful') });
    },
    onError: (error: Error) => {
      logger.error({
        component: 'connectors',
        action: 'test-connector-error',
        message: error.message,
      });
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
