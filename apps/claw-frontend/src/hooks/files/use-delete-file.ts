import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger, showToast } from '@/utilities';

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      logger.info({ component: 'files', action: 'delete-file', message: 'Deleting file', details: { fileId: id } });
      return filesRepository.deleteFile(id);
    },
    onSuccess: () => {
      logger.info({ component: 'files', action: 'delete-file-success', message: 'File deleted' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
      showToast.success({ title: t('files.fileDeleted') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'files', action: 'delete-file-error', message: error.message });
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
