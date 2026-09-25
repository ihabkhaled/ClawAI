import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { useChunkedUpload } from '@/hooks/files/use-chunked-upload';
import { useComposerUploadEntries } from '@/hooks/files/use-composer-upload-entries';
import { useTranslation } from '@/lib/i18n';
import { uploadFileSchema } from '@/lib/validation/file.schema';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseComposerAttachmentsParams, UseComposerAttachmentsReturn } from '@/types';
import type { PendingComposerUpload } from '@/types/composer-attachment.types';
import { logger, showToast } from '@/utilities';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { classifyUploadError } from '@/utilities/composer-attachment.utility';

// Shared paste / drop / file-input / recorder ingestion for every composer
// surface (main chat, Compare, and all nine orchestration labs — they all
// route through this one hook via useMessageComposerState / useOrchestrationComposer).
// Each file flows through the SAME secure upload pipeline the paperclip picker
// uses (antivirus, magic-byte check, server-side chunk reassembly), via
// useChunkedUpload — which also owns the retry/backoff and percent/ETA/speed
// readout for whichever file is currently uploading. Uploads run concurrently.
//
// Every file also gets an entry in `uploads` (useComposerUploadEntries), so the
// composer can say which file is uploading, which failed and why, or which was
// refused as unsupported — and a `pendingUploads` tile while it is in flight.
//
// Each resolved upload appends through a FUNCTIONAL state update. Appending to
// the render's snapshot — or to a ref re-synced from props — lost files: three
// uploads resolving before the next render each appended to the same stale
// list, and dropping 11 files live kept 8. The cap
// (MAX_ATTACHMENTS_PER_MESSAGE, the server's own limit) is checked when files
// arrive (selected + still uploading) and again inside the updater.
//
// No per-file "Attached X" toast: the tray above the textarea shows every
// attached file, and three success toasts pushed the cap warning out of the
// toast stack before anyone could read it.
//
// Every upload owns an AbortController. Dismissing its entry (the pending
// tile's cancel, or removing its chip) aborts it: useChunkedUpload sends no
// further chunk and deletes the server session, and the abort is not reported
// as a failure. Unmounting the composer aborts whatever is still in flight.
export function useComposerAttachments({
  selectedFileIds,
  onChange,
  disabled,
}: UseComposerAttachmentsParams): UseComposerAttachmentsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingUploads, setPendingUploads] = useState<PendingComposerUpload[]>([]);
  const { upload, progress } = useChunkedUpload();
  const uploads = useComposerUploadEntries();
  const { begin, settle, dismiss } = uploads;
  const selectedRef = useRef(selectedFileIds);
  const pendingRef = useRef(0);
  const controllersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    selectedRef.current = selectedFileIds;
  }, [selectedFileIds]);

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []);

  const uploadOne = useCallback(
    async (file: File, pending: PendingComposerUpload, signal: AbortSignal): Promise<void> => {
      try {
        const fileId = await upload(file, { signal });
        if (signal.aborted) {
          // Taken back while the last request was already answering: the
          // file is stored, but the user said they do not want it attached.
          return;
        }
        settle(pending.key, { state: ComposerAttachmentState.Uploaded, fileId });
        void queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
        // Dedup so re-pasting the same upload is a no-op.
        onChange((current) =>
          current.includes(fileId) || current.length >= MAX_ATTACHMENTS_PER_MESSAGE
            ? current
            : [...current, fileId],
        );
        logger.info({
          component: 'chat',
          action: 'composer-attachment-ingested',
          message: 'Pasted/dropped/recorded file uploaded and attached',
          details: { fileId, sizeBytes: file.size },
        });
      } catch (error) {
        if (signal.aborted) {
          logger.info({
            component: 'chat',
            action: 'composer-attachment-upload-aborted',
            message: 'Upload taken back by the user before it finished',
            details: { sizeBytes: file.size },
          });
          return;
        }
        settle(pending.key, {
          state: classifyUploadError(error),
          reason: resolveApiErrorMessage(error, t, t('files.fileUploadFailed')),
        });
        logger.error({
          component: 'chat',
          action: 'composer-attachment-error',
          message: (error as Error).message,
        });
        showToast.apiError(error, t('files.fileUploadFailed'), { translate: t });
      } finally {
        controllersRef.current.delete(pending.key);
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setPendingUploads((list) => list.filter((item) => item.key !== pending.key));
      }
    },
    [onChange, queryClient, settle, t, upload],
  );

  const ingestFiles = useCallback(
    (files: FileList | File[] | null | undefined): void => {
      if (disabled === true || files === null || files === undefined) {
        return;
      }
      const list = Array.from(files);
      if (list.length === 0) {
        return;
      }
      const room = Math.max(
        0,
        MAX_ATTACHMENTS_PER_MESSAGE - selectedRef.current.length - pendingRef.current,
      );
      if (list.length > room) {
        showToast.error({
          title: t('chat.attachment.tooMany', { max: MAX_ATTACHMENTS_PER_MESSAGE }),
        });
        logger.warn({
          component: 'chat',
          action: 'composer-attachment-cap',
          message: 'Refused files past the per-message attachment cap',
          details: { offered: list.length, accepted: room, max: MAX_ATTACHMENTS_PER_MESSAGE },
        });
      }

      for (const file of list.slice(0, room)) {
        const localId = begin(file.name);
        const metadata = {
          filename: file.name,
          mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
          sizeBytes: file.size,
        };
        const parsed = uploadFileSchema.safeParse(metadata);
        if (!parsed.success) {
          const reason = parsed.error.issues[0]?.message ?? null;
          settle(localId, { state: ComposerAttachmentState.Unsupported, reason });
          showToast.error({ title: t('files.fileUploadFailed'), description: reason ?? undefined });
          continue;
        }
        const pending: PendingComposerUpload = { key: localId, ...metadata };
        const controller = new AbortController();
        controllersRef.current.set(localId, controller);
        pendingRef.current += 1;
        setPendingUploads((current) => [...current, pending]);
        void uploadOne(file, pending, controller.signal);
      }
    },
    [begin, disabled, settle, t, uploadOne],
  );

  // Dismiss = take back. A file still uploading is aborted and its tile goes
  // at once; a failed / unsupported entry simply leaves the chip strip.
  const dismissUpload = useCallback(
    (localId: string): void => {
      const controller = controllersRef.current.get(localId);
      if (controller !== undefined) {
        controller.abort();
        controllersRef.current.delete(localId);
        setPendingUploads((list) => list.filter((item) => item.key !== localId));
      }
      dismiss(localId);
    },
    [dismiss],
  );

  const removeAttachment = useCallback(
    (fileId: string): void => {
      onChange((current) => current.filter((id) => id !== fileId));
    },
    [onChange],
  );

  return {
    ingestFiles,
    removeAttachment,
    isUploading: pendingUploads.length > 0,
    pendingCount: pendingUploads.length,
    pendingUploads,
    progress,
    uploads: uploads.entries,
    dismissUpload,
  };
}
