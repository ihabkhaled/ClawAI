import type { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import type { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import type { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import type { FileExtractionMetadata, UploadedFile } from '@/types/file.types';
import type { UploadProgressSnapshot } from '@/types/upload-progress.types';
import type { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';

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
  /** A selected VIDEO still processing: its owner may stop the processing. */
  canCancelProcessing: boolean;
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
  mimeType?: string;
  extractionMetadata?: FileExtractionMetadata | null;
};

/** The "Stop processing" action of one attached video, ready to render. */
export type ComposerProcessingCancel = {
  label: string;
  ariaLabel: string;
  isCancelling: boolean;
  onCancel: () => void;
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
  /** Per selected file id: the Stop action of a video still processing. */
  processingCancelByFileId: ReadonlyMap<string, ComposerProcessingCancel>;
};

export type ComposerAttachmentChipsProps = Omit<
  UseComposerAttachmentChipsReturn,
  'processingCancelByFileId'
>;

export type ComposerAttachmentChipProps = {
  chip: ComposerAttachmentChip;
  onRemove: (chip: ComposerAttachmentChip) => void;
};

/** A file the composer is still uploading — shown as a tile before it has an id. */
export type PendingComposerUpload = {
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Everything the tray above a composer's textarea needs. One bag so every
 * surface (chat, Compare, in-thread Compare, the nine labs) renders the same
 * tray from the same hook output.
 */
export type ComposerAttachmentTrayProps = {
  fileIds: string[];
  pendingUploads: PendingComposerUpload[];
  progress: UploadProgressSnapshot | null;
  onRemove: (fileId: string) => void;
  disabled?: boolean;
  /**
   * The state line for a selected file that is not simply ready — "Processing
   * — you can send now", "Failed — <reason>" — from the chip resolver, so a
   * file is listed once, with its preview AND its state.
   */
  statusByFileId?: ReadonlyMap<string, string>;
  /** The Stop action of each attached video still processing (pack §72). */
  processingCancelByFileId?: ReadonlyMap<string, ComposerProcessingCancel>;
  /** Takes back a file still uploading: aborts it and drops its tile. */
  onCancelUpload?: (key: string) => void;
};

export type ComposerAttachmentTileProps = {
  fileId: string;
  onRemove: (fileId: string) => void;
  disabled?: boolean;
  status?: string;
  processingCancel?: ComposerProcessingCancel;
};

export type ComposerPendingAttachmentTileProps = {
  upload: PendingComposerUpload;
  progress: UploadProgressSnapshot | null;
  /** Absent: no cancel button (a surface that cannot abort). */
  onCancel?: (key: string) => void;
  cancelLabel: string;
};

export type UseComposerAttachmentTileReturn = {
  file: UploadedFile | undefined;
  kind: AttachmentPreviewKind | null;
  /** Non-null only for a voice or video note, which renders as a player. */
  mediaKind: AttachmentPreviewKind.Audio | AttachmentPreviewKind.Video | null;
  showPlaceholder: boolean;
  showImage: boolean;
  showMedia: boolean;
  showDocument: boolean;
  descriptor: ReturnType<typeof getFileTypeDescriptor> | null;
  label: string;
  sizeLabel: string | null;
  removeLabel: string;
};

/**
 * The composer that a whole-panel drop feeds. The chat thread panel wraps the
 * messages AND the composer, but the upload pipeline lives inside the composer,
 * so the composer registers its ingest function here and the panel reads it.
 */
export type ComposerDropTargetStore = {
  ingest: ((files: FileList | File[]) => void) | null;
  register: (ingest: (files: FileList | File[]) => void) => void;
  unregister: (ingest: (files: FileList | File[]) => void) => void;
};

export type ChatPanelDropzoneProps = {
  className?: string;
  children: React.ReactNode;
};

export type UseChatPanelDropzoneReturn = {
  onFiles: (files: FileList | File[]) => void;
  disabled: boolean;
};
