import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { AssignRoleRequest } from '@/types';
import { showToast } from '@/utilities';

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: AssignRoleRequest) => ollamaRepository.assignRole(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.localModels.all,
      });
      showToast.success({ title: t('models.roleAssigned') });
    },
    onError: (error: Error) => {
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
