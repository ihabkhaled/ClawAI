import { useCallback, useRef, useState } from 'react';

import type { UseFileUploadZoneStateReturn } from '@/types';

export function useFileUploadZoneState(
  onFileSelected: (file: File) => void,
  isUploading: boolean,
): UseFileUploadZoneStateReturn {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) {
        setIsDragOver(true);
      }
    },
    [isUploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isUploading) {
        return;
      }

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelected(droppedFile);
      }
    },
    [isUploading, onFileSelected],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelected(selectedFile);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFileSelected],
  );

  const handleClick = useCallback((): void => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  return {
    isDragOver,
    inputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    handleClick,
  };
}
