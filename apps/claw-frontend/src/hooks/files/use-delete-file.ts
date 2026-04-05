import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { showToast } from '@/utilities';

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => filesRepository.deleteFile(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
      showToast.success({ title: t('files.fileDeleted') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('files.fileDeleteFailed'));
    },
  });

  return {
    deleteFile: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
