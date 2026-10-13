import type { LucideIcon } from 'lucide-react';

import type { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import type { FileLibraryThumbSize } from '@/enums/file-library-thumb-size.enum';
import type { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import type { UploadedFile } from '@/types/file.types';

import type { UseArchiveSelectionReturn } from './archive.types';
import type { FileLibraryMenuProps } from './file-library.types';
import type { TranslateFunction } from './i18n.types';

export type FileLibraryFilterOption = {
  filter: FileLibraryFilter;
  labelKey: string;
};

/**
 * The menu contract plus one optional hook-in: a host whose menu unmounts its
 * content when it closes cannot keep the Browse-all dialog alive, so it passes
 * `onBrowseAll` and renders `FileLibraryDialog` itself. Without it the menu
 * renders the dialog beside its own content.
 */
export type FileLibraryMenuInnerProps = FileLibraryMenuProps & {
  onBrowseAll?: () => void;
};

export type FileLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFileIds: FileLibraryMenuProps['selectedFileIds'];
  onChange: FileLibraryMenuProps['onChange'];
  ingestFiles: FileLibraryMenuProps['ingestFiles'];
  isUploading: boolean;
  disabled?: boolean;
  /** Called after "Attach N", so a hosting menu closes with the dialog. */
  onDone?: () => void;
};

/** The dialog body is only mounted while open, so it has no `open` prop. */
export type FileLibraryDialogBodyProps = Omit<FileLibraryDialogProps, 'open'>;

export type UseFileLibraryDialogParams = {
  selectedFileIds: FileLibraryDialogProps['selectedFileIds'];
  onChange: FileLibraryDialogProps['onChange'];
  ingestFiles: FileLibraryDialogProps['ingestFiles'];
  isUploading: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

export type FileLibraryThumbProps = {
  file: UploadedFile;
  size: FileLibraryThumbSize;
};

export type UseFileLibraryThumbReturn = {
  src: string | null;
  Icon: LucideIcon;
  tone: string;
  handleImageError: () => void;
  /** Attach to the thumbnail's box: the image is fetched once it is on screen. */
  inViewRef: React.RefCallback<HTMLElement>;
};

export type UseInViewReturn = {
  inViewRef: React.RefCallback<HTMLElement>;
  isInView: boolean;
};

export type UseFileThumbnailBlobReturn = {
  blobUrl: string | null;
  isError: boolean;
};

export type FileLibraryRowProps = {
  file: UploadedFile;
  checked: boolean;
  /** True when the file is not selected and the per-message cap is reached. */
  disabled: boolean;
  selectedMemberCount: number;
  onToggle: (file: UploadedFile) => void;
  onBrowseArchive: (file: UploadedFile) => void;
};

export type FileLibraryTileProps = FileLibraryRowProps;

export type UseFileLibraryRowReturn = {
  t: TranslateFunction;
  isArchive: boolean;
  /** "Voice note · 1.2 MB · Oct 5", "Attach whole · 12 files · …", or just size and date. */
  metaLine: string;
  /** The microphone / camera mark of a recorded clip, else null. */
  KindIcon: LucideIcon | null;
  statusLabel: string | null;
  StatusIcon: LucideIcon | null;
  statusSpin: boolean;
  showBrowseArchive: boolean;
};

export type FileLibrarySearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  clearLabel: string;
};

export type UseFileLibraryNavReturn = {
  containerRef: React.RefCallback<HTMLDivElement>;
};

export type UseFileLibraryMenuParams = FileLibraryMenuInnerProps;

export type UseFileLibraryMenuReturn = {
  t: TranslateFunction;
  query: string;
  setQuery: (value: string) => void;
  files: UploadedFile[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isAtCap: boolean;
  selection: UseArchiveSelectionReturn;
  toggleFile: (file: UploadedFile) => void;
  isDisabled: (file: UploadedFile) => boolean;
  browsingArchive: UploadedFile | null;
  openArchive: (file: UploadedFile) => void;
  handleArchiveDialogOpenChange: (open: boolean) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  handleBrowseAll: () => void;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragLeave: () => void;
  openFilePicker: () => void;
};

export type UseFileLibraryViewModeReturn = {
  viewMode: FileLibraryViewMode;
  setViewMode: (mode: FileLibraryViewMode) => void;
};

export type UseFileLibraryDialogReturn = {
  t: TranslateFunction;
  query: string;
  setQuery: (value: string) => void;
  filter: FileLibraryFilter;
  setFilter: (filter: FileLibraryFilter) => void;
  viewMode: FileLibraryViewMode;
  setViewMode: (mode: FileLibraryViewMode) => void;
  files: UploadedFile[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isAtCap: boolean;
  selection: UseArchiveSelectionReturn;
  selectedCount: number;
  toggleFile: (file: UploadedFile) => void;
  isDisabled: (file: UploadedFile) => boolean;
  getRowProps: (file: UploadedFile) => FileLibraryRowProps;
  browsingArchive: UploadedFile | null;
  openArchive: (file: UploadedFile) => void;
  handleArchiveDialogOpenChange: (open: boolean) => void;
  uploadingFiles: File[];
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragLeave: () => void;
  openFilePicker: () => void;
  handleAttach: () => void;
  handleCancel: () => void;
};

export type UseFilePreviewUrlReturn = {
  previewUrl: string | null;
  /** An image that could not be previewed (too big, or it will not decode): draw its type icon. */
  showFallbackIcon: boolean;
  handleError: () => void;
};

export type FileLibraryCheckProps = {
  checked: boolean;
  className?: string;
};

export type FileLibraryListStateProps = {
  isLoading: boolean;
  isError: boolean;
  hasQuery: boolean;
  /** The library holds files but the search/filter hides them all. */
  hasFiles?: boolean;
  query: string;
  t: TranslateFunction;
};

export type FileLibraryFilterChipsProps = {
  filter: FileLibraryFilter;
  onChange: (filter: FileLibraryFilter) => void;
  t: TranslateFunction;
};

export type FileLibraryViewToggleProps = {
  viewMode: FileLibraryViewMode;
  onChange: (mode: FileLibraryViewMode) => void;
  t: TranslateFunction;
};

export type FileLibraryUploadTileProps = {
  file: File;
  uploadingLabel: string;
};
