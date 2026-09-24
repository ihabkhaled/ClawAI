import { useCallback, useRef, useState } from 'react';

import type {
  UseFileAttachmentPickerStateParams,
  UseFileAttachmentPickerStateReturn,
} from '@/types';
import { logger } from '@/utilities';

// Selection itself lives in useArchiveSelection, which keeps a whole archive
// and a file picked from inside it from both being attached.
//
// Upload itself is delegated to `ingestFiles` (use-composer-attachments.ts /
// use-chunked-upload.ts) — the same pipeline paste, drag-drop-onto-composer
// and the recorder already use. It owns its own validation (uploadFileSchema),
// chunking above the threshold, retry/backoff and the percent/ETA/speed
// readout, so this hook no longer reads the file itself.
export const useFileAttachmentPickerState = ({
  selectedFileIds,
  ingestFiles,
}: UseFileAttachmentPickerStateParams): UseFileAttachmentPickerStateReturn => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(
    (file: File): void => {
      logger.info({
        component: 'chat',
        action: 'file-attach-upload',
        message: 'Uploading file attachment',
        details: { filename: file.name, sizeBytes: file.size },
      });
      ingestFiles([file]);
    },
    [ingestFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (e.target.files && e.target.files.length > 0) {
        ingestFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [ingestFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        ingestFiles(e.dataTransfer.files);
      }
    },
    [ingestFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((): void => {
    setDragOver(false);
  }, []);

  const selectedCount = selectedFileIds.length;

  return {
    dragOver,
    fileInputRef,
    handleFileUpload,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    selectedCount,
  };
};
