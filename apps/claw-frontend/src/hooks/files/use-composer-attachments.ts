import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { uploadFileSchema } from '@/lib/validation/file.schema';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UploadFileRequest,
  UploadedFile,
  UseComposerAttachmentsParams,
  UseComposerAttachmentsReturn,
} from '@/types';
import { logger, showToast } from '@/utilities';
import { readFileAsBase64 } from '@/utilities/file-read.utility';

// Shared paste / drop / file-input ingestion for every composer surface.
// Each file flows through the SAME secure upload pipeline the paperclip picker
// uses (antivirus, magic-byte, chunking server-side) via filesRepository, and
// on success its fileId is appended to the caller's selected list so it is sent
// to the model identically to a picked file. Uploads run concurrently; the
// selected list is updated per-file as each upload resolves.
export function useComposerAttachments({
  selectedFileIds,
  onChange,
  disabled,
}: UseComposerAttachmentsParams): UseComposerAttachmentsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);

  const mutation = useMutation<UploadedFile, Error, UploadFileRequest>({
    mutationFn: (data) => filesRepository.uploadFile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
    },
  });
  const { mutateAsync } = mutation;

  const ingestFiles = useCallback(
    (files: FileList | File[] | null | undefined): void => {
      if (disabled === true || files === null || files === undefined) {
        return;
      }
      const list = Array.from(files);
      if (list.length === 0) {
        return;
      }

      setPendingCount((count) => count + list.length);
      for (const file of list) {
        const metadata = {
          filename: file.name,
          mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
          sizeBytes: file.size,
        };
        const parsed = uploadFileSchema.safeParse(metadata);
        if (!parsed.success) {
          setPendingCount((count) => Math.max(0, count - 1));
          showToast.error({
            title: t('files.fileUploadFailed'),
            description: parsed.error.issues[0]?.message,
          });
          continue;
        }

        void (async (): Promise<void> => {
          try {
            const content = await readFileAsBase64(file);
            const uploaded = await mutateAsync({
              ...parsed.data,
              storagePath: `/uploads/${file.name}`,
              content,
            });
            // Append by fileId; dedup so re-pasting the same upload is a no-op.
            onChange(
              selectedFileIds.includes(uploaded.id)
                ? selectedFileIds
                : [...selectedFileIds, uploaded.id],
            );
            logger.info({
              component: 'chat',
              action: 'composer-attachment-ingested',
              message: 'Pasted/dropped file uploaded and attached',
              details: { fileId: uploaded.id, sizeBytes: file.size },
            });
            showToast.success({ title: t('chat.attachment.added', { name: file.name }) });
          } catch (error) {
            logger.error({
              component: 'chat',
              action: 'composer-attachment-error',
              message: (error as Error).message,
            });
            showToast.apiError(error, t('files.fileUploadFailed'));
          } finally {
            setPendingCount((count) => Math.max(0, count - 1));
          }
        })();
      }
    },
    [disabled, mutateAsync, onChange, selectedFileIds, t],
  );

  return {
    ingestFiles,
    isUploading: pendingCount > 0 || mutation.isPending,
    pendingCount,
  };
}
