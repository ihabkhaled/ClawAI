import { useCallback, useState } from 'react';

import { useArchiveSelection } from '@/hooks/files/use-archive-selection';
import { useFiles } from '@/hooks/files/use-files';
import { useUploadFile } from '@/hooks/files/use-upload-file';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  UseArchiveSelectionParams,
  UseFileAttachmentPickerReturn,
} from '@/types/archive.types';
import type { UploadedFile } from '@/types/file.types';
import { isArchiveFile } from '@/utilities/archive-status.utility';

import { useFileAttachmentPickerState } from './use-file-attachment-picker-state';

/**
 * Controller for the composer's paperclip picker. Lists top-level files; an
 * archive is one row (attach it whole) plus a way into its contents, where
 * individual files can be picked instead — never both, see useArchiveSelection.
 */
export function useFileAttachmentPicker({
  selectedFileIds,
  onChange,
}: UseArchiveSelectionParams): UseFileAttachmentPickerReturn {
  const { t } = useTranslation();
  const { files, isLoading } = useFiles();
  const { uploadFile, isPending: isUploading } = useUploadFile();
  const pickerState = useFileAttachmentPickerState({ selectedFileIds, uploadFile });
  const selection = useArchiveSelection({ selectedFileIds, onChange });
  const [browsingArchive, setBrowsingArchive] = useState<UploadedFile | null>(null);

  const openArchive = useCallback((file: UploadedFile): void => setBrowsingArchive(file), []);
  const handleArchiveDialogOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setBrowsingArchive(null);
    }
  }, []);

  return {
    ...pickerState,
    t,
    files,
    isLoading,
    isUploading,
    selection,
    isArchive: isArchiveFile,
    browsingArchive,
    openArchive,
    handleArchiveDialogOpenChange,
  };
}
