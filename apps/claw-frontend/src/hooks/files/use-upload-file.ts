import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UploadFileRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: UploadFileRequest) => {
      logger.info({ component: 'files', action: 'upload-file', message: 'Uploading file', details: { filename: data.filename, mimeType: data.mimeType, sizeBytes: data.sizeBytes } });
      return filesRepository.uploadFile(data);
    },
    onSuccess: () => {
      logger.info({ component: 'files', action: 'upload-file-success', message: 'File uploaded' });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
      showToast.success({ title: t('files.fileUploaded') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'files', action: 'upload-file-error', message: error.message });
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
