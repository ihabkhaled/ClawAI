import { useCallback, useMemo, useState } from 'react';

import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import {
  FILE_LIBRARY_RECENT_COUNT,
  FILE_LIBRARY_SEARCH_RESULT_COUNT,
} from '@/constants/file-library.constants';
import { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import { useFileAttachmentPickerState } from '@/hooks/chat/use-file-attachment-picker-state';
import { useArchiveSelection } from '@/hooks/files/use-archive-selection';
import { useFiles } from '@/hooks/files/use-files';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  UseFileLibraryMenuParams,
  UseFileLibraryMenuReturn,
} from '@/types/file-library-ui.types';
import type { UploadedFile } from '@/types/file.types';
import { filterLibraryFiles, sortFilesNewestFirst } from '@/utilities/file-library.utility';

/**
 * Controller for the quick list: the most recent files (or the best matches for
 * the search), selection that respects the per-message cap and the archive rule,
 * and the upload entry points. Upload itself is the composer's `ingestFiles`,
 * the same chunked pipeline paste, drop and the recorder use.
 */
export function useFileLibraryMenu({
  selectedFileIds,
  onChange,
  ingestFiles,
  onDone,
  onBrowseAll,
}: UseFileLibraryMenuParams): UseFileLibraryMenuReturn {
  const { t } = useTranslation();
  const { files: allFiles, isLoading, isError } = useFiles();
  const pickerState = useFileAttachmentPickerState({ selectedFileIds, ingestFiles });
  const selection = useArchiveSelection({ selectedFileIds, onChange });
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [browsingArchive, setBrowsingArchive] = useState<UploadedFile | null>(null);

  const isAtCap = selectedFileIds.length >= MAX_ATTACHMENTS_PER_MESSAGE;
  const hasQuery = query.trim().length > 0;

  const files = useMemo(
    () =>
      filterLibraryFiles(sortFilesNewestFirst(allFiles), query, FileLibraryFilter.All).slice(
        0,
        hasQuery ? FILE_LIBRARY_SEARCH_RESULT_COUNT : FILE_LIBRARY_RECENT_COUNT,
      ),
    [allFiles, query, hasQuery],
  );

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
  const handleArchiveDialogOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setBrowsingArchive(null);
    }
  }, []);

  // The hidden input lives inside the menu, so the menu must stay mounted until
  // the browser's file dialog answers: close it after the choice, not on click.
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      pickerState.handleInputChange(event);
      onDone?.();
    },
    [pickerState, onDone],
  );
  const handleDrop = useCallback(
    (event: React.DragEvent): void => {
      pickerState.handleDrop(event);
      onDone?.();
    },
    [pickerState, onDone],
  );
  const openFilePicker = useCallback(
    (): void => pickerState.fileInputRef.current?.click(),
    [pickerState],
  );

  const handleBrowseAll = useCallback((): void => {
    if (onBrowseAll === undefined) {
      setDialogOpen(true);
      return;
    }
    // The host owns closing itself in the same step that opens its dialog.
    onBrowseAll();
  }, [onBrowseAll]);

  return {
    t,
    query,
    setQuery,
    files,
    totalCount: allFiles.length,
    isLoading,
    isError,
    isAtCap,
    selection,
    toggleFile,
    isDisabled,
    browsingArchive,
    openArchive,
    handleArchiveDialogOpenChange,
    dialogOpen,
    setDialogOpen,
    handleBrowseAll,
    dragOver: pickerState.dragOver,
    fileInputRef: pickerState.fileInputRef,
    handleInputChange,
    handleDrop,
    handleDragOver: pickerState.handleDragOver,
    handleDragLeave: pickerState.handleDragLeave,
    openFilePicker,
  };
}
