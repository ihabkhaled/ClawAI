import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UploadFileRequest } from '@/types';
import { showToast } from '@/utilities';

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: UploadFileRequest) => filesRepository.uploadFile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
      showToast.success({ title: t('files.fileUploaded') });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('files.fileUploadFailed'));
    },
  });

  return {
    uploadFile: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
