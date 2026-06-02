import { useCallback, useRef, useState } from 'react';

import type {
  UseComposerDropzoneParams,
  UseComposerDropzoneReturn,
} from '@/types';
import { extractFilesFromDataTransfer } from '@/utilities/data-transfer.utility';

// Controller for ComposerDropzone. Owns the drag-active visual state plus the
// paste / drag / drop event handling. Drag enter/leave are reference-counted so
// the overlay does not flicker when the cursor crosses child element borders.
export function useComposerDropzone({
  onFiles,
  disabled,
}: UseComposerDropzoneParams): UseComposerDropzoneReturn {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepth = useRef(0);

  const emit = useCallback(
    (files: File[]): void => {
      if (disabled === true || files.length === 0) {
        return;
      }
      onFiles(files);
    },
    [disabled, onFiles],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent): void => {
      if (disabled === true) {
        return;
      }
      const files = extractFilesFromDataTransfer(event.clipboardData);
      if (files.length === 0) {
        return;
      }
      // Only swallow the paste when it actually carried files, so plain-text
      // paste into the textarea still works normally.
      event.preventDefault();
      emit(files);
    },
    [disabled, emit],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent): void => {
      if (disabled === true) {
        return;
      }
      event.preventDefault();
    },
    [disabled],
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent): void => {
      if (disabled === true) {
        return;
      }
      event.preventDefault();
      dragDepth.current += 1;
      if (Array.from(event.dataTransfer.types).includes('Files')) {
        setIsDragActive(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragActive(false);
      emit(extractFilesFromDataTransfer(event.dataTransfer));
    },
    [emit],
  );

  return {
    isDragActive,
    handlePaste,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
