import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { useChunkedUpload } from '@/hooks/files/use-chunked-upload';
import { useComposerUploadEntries } from '@/hooks/files/use-composer-upload-entries';
import { useTranslation } from '@/lib/i18n';
import { uploadFileSchema } from '@/lib/validation/file.schema';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseComposerAttachmentsParams, UseComposerAttachmentsReturn } from '@/types';
import { logger, showToast } from '@/utilities';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { classifyUploadError } from '@/utilities/composer-attachment.utility';

// Shared paste / drop / file-input / recorder ingestion for every composer
// surface (main chat, Compare, and all nine orchestration labs — they all
// route through this one hook via useMessageComposerState / useOrchestrationComposer).
// Each file flows through the SAME secure upload pipeline the paperclip picker
// uses (antivirus, magic-byte check, server-side chunk reassembly), via
// useChunkedUpload — which also owns the retry/backoff and percent/ETA/speed
// readout for whichever file is currently uploading. Uploads run concurrently;
// the selected list is updated per-file as each upload resolves.
//
// Every file also gets an entry in `uploads` (useComposerUploadEntries), so the
// composer can show a chip per file — uploading, failed with its reason, or
// refused as unsupported — instead of one anonymous pending count.
export function useComposerAttachments({
  selectedFileIds,
  onChange,
  disabled,
}: UseComposerAttachmentsParams): UseComposerAttachmentsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const { upload, progress } = useChunkedUpload();
  const uploads = useComposerUploadEntries();
  const { begin, settle } = uploads;

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
        const localId = begin(file.name);
        const metadata = {
          filename: file.name,
          mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
          sizeBytes: file.size,
        };
        const parsed = uploadFileSchema.safeParse(metadata);
        if (!parsed.success) {
          setPendingCount((count) => Math.max(0, count - 1));
          const reason = parsed.error.issues[0]?.message ?? null;
          settle(localId, { state: ComposerAttachmentState.Unsupported, reason });
          showToast.error({ title: t('files.fileUploadFailed'), description: reason ?? undefined });
          continue;
        }

        void (async (): Promise<void> => {
          try {
            const fileId = await upload(file);
            settle(localId, { state: ComposerAttachmentState.Uploaded, fileId });
            void queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
            // Append by fileId; dedup so re-pasting the same upload is a no-op.
            onChange(
              selectedFileIds.includes(fileId) ? selectedFileIds : [...selectedFileIds, fileId],
            );
            logger.info({
              component: 'chat',
              action: 'composer-attachment-ingested',
              message: 'Pasted/dropped/recorded file uploaded and attached',
              details: { fileId, sizeBytes: file.size },
            });
            showToast.success({ title: t('chat.attachment.added', { name: file.name }) });
          } catch (error) {
            settle(localId, {
              state: classifyUploadError(error),
              reason: resolveApiErrorMessage(error, t, t('files.fileUploadFailed')),
            });
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
    [begin, disabled, onChange, queryClient, selectedFileIds, settle, t, upload],
  );

  return {
    ingestFiles,
    isUploading: pendingCount > 0,
    pendingCount,
    progress,
    uploads: uploads.entries,
    dismissUpload: uploads.dismiss,
  };
}
