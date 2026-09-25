import {
  COMPOSER_ATTACHMENT_PROCESSING_FAILED_KEY,
  COMPOSER_ATTACHMENT_PROCESSING_HINT_KEY,
  COMPOSER_ATTACHMENT_REMOVE_KEY,
  COMPOSER_ATTACHMENT_STATE_LABEL_KEYS,
  COMPOSER_ATTACHMENT_UNNAMED_KEY,
  COMPOSER_ATTACHMENT_UNSUPPORTED_KEY,
  COMPOSER_ATTACHMENT_UNSUPPORTED_STATUS,
  COMPOSER_ATTACHMENT_UPLOAD_FAILED_KEY,
} from '@/constants/composer-attachment.constants';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  ComposerAttachmentChip,
  ComposerAttachmentChipDraft,
  ResolveComposerAttachmentChipsInput,
} from '@/types/composer-attachment.types';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * Where each composer attachment is, as one ordered list of chips.
 *
 * Two sources, joined:
 * - the composer's own upload entries — Uploading, and a Failed / Unsupported
 *   upload that never produced a file id (it stays until dismissed, so the
 *   reason is readable, not a toast that vanished);
 * - the selected file ids, whose state comes from the file list the composer
 *   already polls (`useFiles`, which polls only while something is ingesting):
 *   PENDING / PROCESSING → Processing (audio transcription, video processing),
 *   FAILED → Failed with the backend's detail, COMPLETED → Ready. A selected id
 *   the list does not contain yet (the refetch has not landed, or the file is
 *   past the first page) is Uploaded — true, and nothing more is claimed.
 */
export function resolveComposerAttachmentChips({
  selectedFileIds,
  uploads,
  files,
}: ResolveComposerAttachmentChipsInput): ComposerAttachmentChipDraft[] {
  const pendingUploads = uploads
    .filter((entry) => entry.fileId === null)
    .map((entry): ComposerAttachmentChipDraft => ({
      key: entry.localId,
      filename: entry.filename,
      state: entry.state,
      fileId: null,
      localId: entry.localId,
      detail: entry.reason,
    }));

  const selected = selectedFileIds.map((fileId): ComposerAttachmentChipDraft => {
    const file = files.find((candidate) => candidate.id === fileId);
    const upload = uploads.find((entry) => entry.fileId === fileId);
    const state = resolveSelectedFileState(file?.ingestionStatus);
    return {
      key: fileId,
      filename: file?.filename ?? upload?.filename ?? null,
      state,
      fileId,
      localId: null,
      detail: state === ComposerAttachmentState.Failed ? (file?.extractionError ?? null) : null,
    };
  });

  return [...pendingUploads, ...selected];
}

function resolveSelectedFileState(
  status: FileIngestionStatus | undefined,
): ComposerAttachmentState {
  switch (status) {
    case FileIngestionStatus.PENDING:
    case FileIngestionStatus.PROCESSING:
      return ComposerAttachmentState.Processing;
    case FileIngestionStatus.FAILED:
      return ComposerAttachmentState.Failed;
    case FileIngestionStatus.COMPLETED:
      return ComposerAttachmentState.Ready;
    default:
      return ComposerAttachmentState.Uploaded;
  }
}

/** A refused type (HTTP 415) is Unsupported; anything else is a failed upload. */
export function classifyUploadError(error: unknown): ComposerAttachmentState {
  return error instanceof ApiClientError && error.status === COMPOSER_ATTACHMENT_UNSUPPORTED_STATUS
    ? ComposerAttachmentState.Unsupported
    : ComposerAttachmentState.Failed;
}

/**
 * Attach the copy to a chip: its display name, the visible state word, the
 * remove button's label, and the second line — the failure REASON (localized
 * sentence, then the backend / upload detail when there is one) or the
 * "still processing, you can send" note.
 */
export function describeComposerAttachmentChip(
  draft: ComposerAttachmentChipDraft,
  t: TranslateFunction,
): ComposerAttachmentChip {
  const displayName = draft.filename ?? t(COMPOSER_ATTACHMENT_UNNAMED_KEY);
  return {
    ...draft,
    displayName,
    stateLabel: t(COMPOSER_ATTACHMENT_STATE_LABEL_KEYS[draft.state]),
    note: resolveChipNote(draft, t),
    removeLabel: t(COMPOSER_ATTACHMENT_REMOVE_KEY, { name: displayName }),
  };
}

function resolveChipNote(draft: ComposerAttachmentChipDraft, t: TranslateFunction): string | null {
  switch (draft.state) {
    case ComposerAttachmentState.Processing:
      return t(COMPOSER_ATTACHMENT_PROCESSING_HINT_KEY);
    case ComposerAttachmentState.Unsupported:
      return withDetail(t(COMPOSER_ATTACHMENT_UNSUPPORTED_KEY), draft.detail);
    case ComposerAttachmentState.Failed:
      return withDetail(
        t(
          draft.fileId === null
            ? COMPOSER_ATTACHMENT_UPLOAD_FAILED_KEY
            : COMPOSER_ATTACHMENT_PROCESSING_FAILED_KEY,
        ),
        draft.detail,
      );
    default:
      return null;
  }
}

function withDetail(reason: string, detail: string | null): string {
  return detail === null || detail.length === 0 ? reason : `${reason}: ${detail}`;
}
