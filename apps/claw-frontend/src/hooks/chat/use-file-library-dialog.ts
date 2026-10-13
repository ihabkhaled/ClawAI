import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import { useFileAttachmentPickerState } from '@/hooks/chat/use-file-attachment-picker-state';
import { useFileLibraryViewMode } from '@/hooks/chat/use-file-library-view-mode';
import { useArchiveSelection } from '@/hooks/files/use-archive-selection';
import { useFiles } from '@/hooks/files/use-files';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  FileLibraryRowProps,
  UseFileLibraryDialogParams,
  UseFileLibraryDialogReturn,
} from '@/types/file-library-ui.types';
import type { UploadedFile } from '@/types/file.types';
import { filterLibraryFiles, sortFilesNewestFirst } from '@/utilities/file-library.utility';

/**
 * Controller for the Browse-all dialog. Picks are a DRAFT until "Attach N":
 * Cancel leaves the composer's attachments exactly as they were. Files that
 * finish uploading while the dialog is open (the composer selects them on its
 * own) are folded into the draft so Attach does not silently drop them.
 */
export function useFileLibraryDialog({
  selectedFileIds,
  onChange,
  ingestFiles,
  isUploading,
  onOpenChange,
  onDone,
}: UseFileLibraryDialogParams): UseFileLibraryDialogReturn {
  const { t } = useTranslation();
  const { files: allFiles, isLoading, isError } = useFiles();
  const { viewMode, setViewMode } = useFileLibraryViewMode();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FileLibraryFilter>(FileLibraryFilter.All);
  const [draft, setDraft] = useState<string[]>(selectedFileIds);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [browsingArchive, setBrowsingArchive] = useState<UploadedFile | null>(null);
  const seenIdsRef = useRef<string[]>(selectedFileIds);
  const selection = useArchiveSelection({ selectedFileIds: draft, onChange: setDraft });

  useEffect(() => {
    const added = selectedFileIds.filter((id) => !seenIdsRef.current.includes(id));
    seenIdsRef.current = selectedFileIds;
    if (added.length > 0) {
      setDraft((current) => [...current, ...added.filter((id) => !current.includes(id))]);
    }
  }, [selectedFileIds]);

  useEffect(() => {
    if (!isUploading) {
      setUploadingFiles((current) => (current.length === 0 ? current : []));
    }
  }, [isUploading]);

  const ingestAndTrack = useCallback(
    (files: FileList | File[]): void => {
      setUploadingFiles(Array.from(files));
      ingestFiles(files);
    },
    [ingestFiles],
  );
  const pickerState = useFileAttachmentPickerState({
    selectedFileIds: draft,
    ingestFiles: ingestAndTrack,
  });

  const files = useMemo(
    () => filterLibraryFiles(sortFilesNewestFirst(allFiles), query, filter),
    [allFiles, query, filter],
  );

  const isAtCap = draft.length >= MAX_ATTACHMENTS_PER_MESSAGE;
  const isDisabled = useCallback(
    (file: UploadedFile): boolean => isAtCap && !selection.isSelected(file.id),
    [isAtCap, selection],
  );
  const toggleFile = useCallback(
    (file: UploadedFile): void => {
      if (isDisabled(file)) {
        return;
      }
      selection.onToggle(file.id, !selection.isSelected(file.id));
    },
    [isDisabled, selection],
  );

  const openArchive = useCallback((file: UploadedFile): void => setBrowsingArchive(file), []);
  const getRowProps = useCallback(
    (file: UploadedFile): FileLibraryRowProps => ({
      file,
      checked: selection.isSelected(file.id),
      disabled: isDisabled(file),
      selectedMemberCount: selection.selectedMemberCount(file.id),
      onToggle: toggleFile,
      onBrowseArchive: openArchive,
    }),
    [selection, isDisabled, toggleFile, openArchive],
  );
  const handleArchiveDialogOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setBrowsingArchive(null);
    }
  }, []);

  const handleAttach = useCallback((): void => {
    onChange(draft);
    onOpenChange(false);
    onDone?.();
  }, [onChange, draft, onOpenChange, onDone]);
  const handleCancel = useCallback((): void => onOpenChange(false), [onOpenChange]);
  const openFilePicker = useCallback(
    (): void => pickerState.fileInputRef.current?.click(),
    [pickerState],
  );

  return {
    t,
    query,
    setQuery,
    filter,
    setFilter,
    viewMode,
    setViewMode,
    files,
    totalCount: allFiles.length,
    isLoading,
    isError,
    isAtCap,
    selection,
    selectedCount: draft.length,
    toggleFile,
    isDisabled,
    getRowProps,
    browsingArchive,
    openArchive,
    handleArchiveDialogOpenChange,
    uploadingFiles: isUploading ? uploadingFiles : [],
    dragOver: pickerState.dragOver,
    fileInputRef: pickerState.fileInputRef,
    handleInputChange: pickerState.handleInputChange,
    handleDrop: pickerState.handleDrop,
    handleDragOver: pickerState.handleDragOver,
    handleDragLeave: pickerState.handleDragLeave,
    openFilePicker,
    handleAttach,
    handleCancel,
  };
}
