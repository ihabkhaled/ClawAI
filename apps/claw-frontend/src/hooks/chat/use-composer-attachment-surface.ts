import { useMemo } from 'react';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { useComposerAttachmentChips } from '@/hooks/chat/use-composer-attachment-chips';
import type {
  UseComposerAttachmentSurfaceParams,
  UseComposerAttachmentSurfaceReturn,
} from '@/types/hook.types';

/**
 * The per-attachment UI of one composer — the ONE implementation every
 * composer surface uses: the main chat composer, Compare, the in-thread
 * Compare dialog and the orchestration labs (through the shell).
 *
 * Until 2026-09-25 only the main composer had it. Compare and the labs showed
 * a paperclip count and a progress bar, so a file stuck in processing, a
 * failed upload or an unsupported type looked exactly like a ready one there,
 * and a video still processing could not be stopped.
 *
 * One list per file. A selected file is a tray tile (preview + remove) with
 * the chip's state line and, for a video still processing, its Stop action. A
 * file still uploading is a pending tile with a cancel button that aborts the
 * upload. The chip strip keeps only uploads that never got an id — failed or
 * not supported.
 */
export function useComposerAttachmentSurface({
  selectedFileIds,
  onSelectedFileIdsChange,
  attachments,
  disabled,
}: UseComposerAttachmentSurfaceParams): UseComposerAttachmentSurfaceReturn {
  const { pendingUploads, progress, removeAttachment, uploads, dismissUpload } = attachments;
  const chipState = useComposerAttachmentChips({
    selectedFileIds,
    onSelectedFileIdsChange,
    uploads,
    onDismissUpload: dismissUpload,
  });

  const attachmentChips = useMemo(
    () => ({
      listLabel: chipState.listLabel,
      onRemove: chipState.onRemove,
      chips: chipState.chips.filter(
        (chip) => chip.fileId === null && chip.state !== ComposerAttachmentState.Uploading,
      ),
    }),
    [chipState],
  );

  const statusByFileId = useMemo(
    () =>
      new Map(
        chipState.chips.flatMap((chip) =>
          chip.fileId === null || chip.note === null
            ? []
            : [[chip.fileId, `${chip.stateLabel} — ${chip.note}`] as const],
        ),
      ),
    [chipState],
  );

  const attachmentTray = useMemo(
    () => ({
      fileIds: selectedFileIds,
      pendingUploads,
      progress,
      onRemove: removeAttachment,
      onCancelUpload: dismissUpload,
      disabled,
      statusByFileId,
      processingCancelByFileId: chipState.processingCancelByFileId,
    }),
    [
      chipState.processingCancelByFileId,
      disabled,
      dismissUpload,
      pendingUploads,
      progress,
      removeAttachment,
      selectedFileIds,
      statusByFileId,
    ],
  );

  return { attachmentTray, attachmentChips };
}
