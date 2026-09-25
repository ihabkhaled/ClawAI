import type { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import type { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';

// composer-attachment.types.ts — per-attachment chip state in the composer.
// Exported shapes only, no runtime code.

/**
 * One file the composer is uploading or has uploaded in this session. Lives
 * only until the page unmounts; a sent or removed file simply stops matching
 * the selected list and drops out of the chips.
 */
export type ComposerUploadEntry = {
  localId: string;
  filename: string;
  /** Uploading, Uploaded, Failed or Unsupported — never Processing/Ready. */
  state: ComposerAttachmentState;
  /** The stored file's id once the upload resolved, null before / on failure. */
  fileId: string | null;
  /** Already-readable detail for a failed / unsupported upload. */
  reason: string | null;
};

export type ComposerUploadEntryPatch = {
  state?: ComposerAttachmentState;
  fileId?: string | null;
  reason?: string | null;
};

export type UseComposerUploadEntriesReturn = {
  entries: ComposerUploadEntry[];
  /** Adds an Uploading entry and returns its local id. */
  begin: (filename: string) => string;
  settle: (localId: string, patch: ComposerUploadEntryPatch) => void;
  dismiss: (localId: string) => void;
};

/** A chip before copy is attached: what `resolveComposerAttachmentChips` returns. */
export type ComposerAttachmentChipDraft = {
  key: string;
  /** Null when neither the file list nor the upload knows the name. */
  filename: string | null;
  state: ComposerAttachmentState;
  /** Set when the chip is a selected file; removing it deselects the id. */
  fileId: string | null;
  /** Set when the chip is an upload entry; removing it dismisses the entry. */
  localId: string | null;
  /** Backend or upload detail behind a failure, shown after the reason. */
  detail: string | null;
};

export type ComposerAttachmentChip = ComposerAttachmentChipDraft & {
  displayName: string;
  stateLabel: string;
  /** Visible second line: the failure reason, or the "still processing" note. */
  note: string | null;
  removeLabel: string;
};

/** The slice of a file-list row the chips read (UploadedFile satisfies it). */
export type ComposerAttachmentFileStatus = {
  id: string;
  filename: string;
  ingestionStatus: FileIngestionStatus;
  extractionError?: string | null;
};

export type ResolveComposerAttachmentChipsInput = {
  selectedFileIds: readonly string[];
  uploads: readonly ComposerUploadEntry[];
  files: readonly ComposerAttachmentFileStatus[];
};

export type UseComposerAttachmentChipsParams = {
  selectedFileIds: string[];
  onSelectedFileIdsChange: (fileIds: string[]) => void;
  uploads: ComposerUploadEntry[];
  onDismissUpload: (localId: string) => void;
};

export type UseComposerAttachmentChipsReturn = {
  chips: ComposerAttachmentChip[];
  listLabel: string;
  onRemove: (chip: ComposerAttachmentChip) => void;
};

export type ComposerAttachmentChipsProps = UseComposerAttachmentChipsReturn;

export type ComposerAttachmentChipProps = {
  chip: ComposerAttachmentChip;
  onRemove: (chip: ComposerAttachmentChip) => void;
};
