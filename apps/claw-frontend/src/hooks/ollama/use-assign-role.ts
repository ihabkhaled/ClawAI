import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { AssignRoleRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: AssignRoleRequest) => {
      logger.info({ component: 'connectors', action: 'assign-role', message: 'Assigning model role', details: { modelId: data.modelId, role: data.role } });
      return ollamaRepository.assignRole(data);
    },
    onSuccess: () => {
      logger.info({ component: 'connectors', action: 'assign-role-success', message: 'Model role assigned' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
      showToast.success({ title: t('models.roleAssigned') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'connectors', action: 'assign-role-error', message: error.message });
      showToast.apiError(error, t('models.roleAssignFailed'));
    },
  });

  return {
    assignRole: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
