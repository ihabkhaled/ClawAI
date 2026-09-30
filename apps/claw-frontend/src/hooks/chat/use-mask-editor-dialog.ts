import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useId } from 'react';

import { MASK_MIME_TYPE } from '@/constants/image-mask-editor.constants';
import { MaskBrushMode } from '@/enums/mask-brush-mode.enum';
import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useMaskEditor } from '@/hooks/chat/use-mask-editor';
import { useAttachmentFileMeta } from '@/hooks/files/use-attachment-file-meta';
import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UseMaskEditorDialogParams,
  UseMaskEditorDialogReturn,
} from '@/types/image-mask-editor.types';
import { logger } from '@/utilities';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { maskFilenameFor } from '@/utilities/image-mask-canvas.utility';

/**
 * Everything the mask dialog needs: the source image (authenticated download),
 * the canvas, and "Apply", which exports the mask PNG and uploads it through
 * the ordinary file pipeline. The returned file id is what rides on the send
 * as `maskFileId`; nothing here talks to a model.
 */
export function useMaskEditorDialog({
  fileId,
  onClose,
  onApplied,
}: UseMaskEditorDialogParams): UseMaskEditorDialogReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hintId = useId();
  const brushId = useId();
  const { file } = useAttachmentFileMeta(fileId);
  const { blobUrl, isLoading, error } = useAuthenticatedFileBlob(
    `/api/v1/files/download/${fileId}`,
    true,
  );
  const editor = useMaskEditor({ imageUrl: blobUrl });

  const upload = useMutation({
    mutationFn: async (): Promise<string> => {
      const mask = editor.exportMask();
      if (mask === null) {
        throw new Error(t('chat.maskEdit.empty'));
      }
      const filename = maskFilenameFor(file?.filename);
      logger.info({
        component: 'chat',
        action: 'mask-upload',
        message: 'Uploading inpainting mask',
        details: { width: mask.width, height: mask.height, sizeBytes: mask.sizeBytes },
      });
      const uploaded = await filesRepository.uploadFile({
        filename,
        mimeType: MASK_MIME_TYPE,
        sizeBytes: mask.sizeBytes,
        storagePath: `/uploads/${filename}`,
        content: mask.base64,
      });
      return uploaded.id;
    },
    onSuccess: (maskFileId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      onApplied(fileId, maskFileId);
      onClose();
    },
    onError: (uploadError: unknown) => {
      logger.warn({
        component: 'chat',
        action: 'mask-upload-error',
        message: uploadError instanceof Error ? uploadError.message : 'Mask upload failed',
      });
    },
  });

  const onErase = useCallback(
    (erasing: boolean): void => {
      editor.setMode(erasing ? MaskBrushMode.Erase : MaskBrushMode.Paint);
    },
    [editor],
  );

  const onBrushChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      editor.setBrushPercent(Number(event.target.value));
    },
    [editor],
  );

  const { mutate } = upload;
  const onApply = useCallback((): void => {
    mutate();
  }, [mutate]);

  return {
    editor,
    imageUrl: blobUrl,
    imageAlt: file?.filename ?? t('chat.attachedFile'),
    isLoadingImage: isLoading,
    imageFailed: error !== null,
    isSaving: upload.isPending,
    errorMessage: upload.isError
      ? resolveApiErrorMessage(upload.error, t, t('chat.maskEdit.saveFailed'))
      : null,
    canApply: editor.hasPaint && !upload.isPending && blobUrl !== null,
    onApply,
    onErase,
    onBrushChange,
    hintId,
    brushId,
  };
}
