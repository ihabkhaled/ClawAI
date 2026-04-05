import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { showToast } from '@/utilities';

export function useDeleteConnector() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => connectorRepository.deleteConnector(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      router.push(ROUTES.CONNECTORS);
      showToast.success({ title: t('connectors.connectorDeleted') });
    },
    onError: (error: Error) => {
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
