import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { FileIngestionStatus } from '@/enums';
import type { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import type { ArchiveTreeNodeKind } from '@/enums/archive-tree-node-kind.enum';

import type { UploadedFile } from './file.types';
import type { TranslateFunction } from './i18n.types';
import type { PaginationMeta } from './pagination.types';

// ─── API contract: GET /files/:id/archive-entries (claw-file-service) ────────

/** One entry of an uploaded archive, extracted or skipped. */
export type ArchiveEntry = {
  /** Path inside the archive, e.g. "docs/intro.md". */
  archivePath: string;
  sizeBytes: number;
  /** An ArchiveEntryStatus value; unknown values display as "unsupported". */
  status: string;
  detail: string | null;
  /** The file this entry became. Null when it was skipped (never extracted). */
  childFileId: string | null;
  mimeType: string | null;
  /** Above 0 for an archive nested inside this one. */
  childCount: number;
};

export type ArchiveEntryListing = {
  archiveFileId: string;
  filename: string;
  ingestionStatus: FileIngestionStatus;
  extractionError: string | null;
  isArchive: boolean;
  entries: ArchiveEntry[];
  /** Entries that exist but are not in `entries`. */
  unlistedEntryCount: number;
};

/** What archive expansion stores on the parent row (`extractionMetadata`). */
export type ArchiveExtractionSummary = {
  childFileCount?: number;
  fileEntryCount?: number;
  skippedEntryCount?: number;
  encryptedEntryCount?: number;
};

/** GET /files answers with the page and its meta. */
export type PaginatedFiles = {
  data: UploadedFile[];
  meta: PaginationMeta;
};

export type FilesQueryFilters = {
  page?: number;
  limit?: number;
  ingestionStatus?: FileIngestionStatus;
  /** List the files extracted from this archive instead of top-level files. */
  parentId?: string;
};

// ─── Tree ────────────────────────────────────────────────────────────────────

export type ArchiveTreeFileNode = {
  kind: ArchiveTreeNodeKind.File;
  key: string;
  name: string;
  entry: ArchiveEntry;
};

export type ArchiveTreeFolderNode = {
  kind: ArchiveTreeNodeKind.Folder;
  /** The folder's path inside the archive, e.g. "docs/api". Unique per tree. */
  key: string;
  name: string;
  children: ArchiveTreeNode[];
  /** Files anywhere under this folder. */
  fileCount: number;
};

export type ArchiveTreeNode = ArchiveTreeFileNode | ArchiveTreeFolderNode;

/** Mutable scaffolding while the tree is assembled from flat paths. */
export type ArchiveTreeBuilderFolder = {
  key: string;
  name: string;
  folders: Map<string, ArchiveTreeBuilderFolder>;
  files: ArchiveTreeFileNode[];
};

export type ArchiveStatusPresentation = {
  labelKey: string;
  icon: LucideIcon;
  /** Tone for the icon only. The label keeps the foreground colour. */
  iconClass: string;
};

export type ArchiveRejection = {
  reason: ArchiveRejectionReason;
  /** True when nothing was delivered (the row FAILED); false for a partial skip. */
  isFatal: boolean;
  code: string;
};

// ─── Selection ───────────────────────────────────────────────────────────────

export type ArchiveSelectionInput = {
  selectedIds: readonly string[];
  targetId: string;
  checked: boolean;
  /** The archives this file sits inside, outermost first. Empty for a top-level file. */
  ancestorIds: readonly string[];
  /** Ancestors recorded for each id picked from an archive tree. */
  ancestryById: ReadonlyMap<string, readonly string[]>;
};

export type ArchiveSelectionResult = {
  selectedIds: string[];
  ancestryById: Map<string, readonly string[]>;
};

/** Picking inside an archive tree. A tree given none is read-only. */
export type ArchiveTreeSelection = {
  isSelected: (fileId: string) => boolean;
  onToggle: (fileId: string, checked: boolean, ancestorIds?: readonly string[]) => void;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export type UseArchiveEntriesReturn = {
  listing: ArchiveEntryListing | undefined;
  isLoading: boolean;
  isError: boolean;
};

export type UseArchiveFolderExpansionReturn = {
  isFolderExpanded: (key: string) => boolean;
  toggleFolder: (key: string) => void;
};

export type UseArchiveTreeReturn = UseArchiveFolderExpansionReturn & {
  t: TranslateFunction;
  listing: ArchiveEntryListing | undefined;
  tree: ArchiveTreeNode[];
  ancestorIds: readonly string[];
  isLoading: boolean;
  isError: boolean;
};

export type UseArchiveSelectionParams = {
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
};

export type UseFileAttachmentPickerParams = UseArchiveSelectionParams & {
  // Same chunked/antivirus/magic-byte upload pipeline every other composer
  // ingestion path uses (paste, drag-drop-onto-composer, recorder) — see
  // use-composer-attachments.ts. Passed down from the composer that owns it
  // rather than instantiated again here, so the paperclip picker's uploads
  // share one in-flight session and one percent/ETA/speed readout with the
  // rest of the composer instead of running a second, un-chunked pipeline.
  ingestFiles: (files: FileList | File[]) => void;
  isUploading?: boolean;
};

export type UseArchiveSelectionReturn = ArchiveTreeSelection & {
  /** How many files inside this archive are picked individually. */
  selectedMemberCount: (archiveId: string) => number;
};

export type UseFileListItemReturn = {
  t: TranslateFunction;
  statusLabel: string;
  statusColor: string;
  typeIcon: LucideIcon;
  typeTone: string;
  isArchive: boolean;
  archiveFileCount: number;
  rejection: ArchiveRejection | null;
  isExpanded: boolean;
  toggleExpanded: () => void;
};

export type UseFileAttachmentPickerReturn = {
  t: TranslateFunction;
  files: UploadedFile[];
  isLoading: boolean;
  isUploading: boolean;
  selection: UseArchiveSelectionReturn;
  isArchive: (file: UploadedFile) => boolean;
  browsingArchive: UploadedFile | null;
  openArchive: (file: UploadedFile) => void;
  handleArchiveDialogOpenChange: (open: boolean) => void;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  selectedCount: number;
};

export type UseMessageAttachmentItemReturn = {
  t: TranslateFunction;
  listing: ArchiveEntryListing | undefined;
  /** Still asking whether this attachment is an archive. */
  isResolving: boolean;
  rejection: ArchiveRejection | null;
  isExpanded: boolean;
  toggleExpanded: () => void;
};

// ─── Components ──────────────────────────────────────────────────────────────

export type ArchiveEntryTreeProps = {
  archiveFileId: string;
  selection?: ArchiveTreeSelection;
  className?: string;
};

export type ArchiveTreeNodeListProps = {
  nodes: ArchiveTreeNode[];
  depth: number;
  ancestorIds: readonly string[];
  selection?: ArchiveTreeSelection;
  isFolderExpanded: (key: string) => boolean;
  onToggleFolder: (key: string) => void;
  t: TranslateFunction;
};

export type ArchiveTreeFolderRowProps = {
  node: ArchiveTreeFolderNode;
  depth: number;
  expanded: boolean;
  onToggle: (key: string) => void;
  t: TranslateFunction;
};

export type ArchiveTreeFileRowProps = {
  node: ArchiveTreeFileNode;
  depth: number;
  ancestorIds: readonly string[];
  selection?: ArchiveTreeSelection;
  t: TranslateFunction;
};

export type ArchiveEntryStatusBadgeProps = {
  status: string;
  t: TranslateFunction;
};

export type ArchiveRejectionNoticeProps = {
  rejection: ArchiveRejection;
  t: TranslateFunction;
  className?: string;
};

export type ArchiveMemberDialogProps = {
  archive: UploadedFile | null;
  selection: ArchiveTreeSelection;
  onOpenChange: (open: boolean) => void;
};

export type FileAttachmentArchiveRowProps = {
  file: UploadedFile;
  checked: boolean;
  selectedMemberCount: number;
  onToggle: (fileId: string, checked: boolean) => void;
  onBrowse: (file: UploadedFile) => void;
  t: TranslateFunction;
};

export type ArchiveAttachmentCardProps = {
  listing: ArchiveEntryListing;
  rejection: ArchiveRejection | null;
  isExpanded: boolean;
  onToggle: () => void;
  t: TranslateFunction;
};

export type MessageAttachmentItemProps = {
  fileId: string;
};

export type ArchiveTreeIndentStyle = CSSProperties;
