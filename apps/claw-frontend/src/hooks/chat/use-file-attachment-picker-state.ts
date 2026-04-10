import { useCallback, useRef, useState } from 'react';

import { uploadFileSchema } from '@/lib/validation/file.schema';
import type {
  UploadFileRequest,
  UseFileAttachmentPickerStateParams,
  UseFileAttachmentPickerStateReturn,
} from '@/types';
import { logger } from '@/utilities';

export const useFileAttachmentPickerState = ({
  selectedFileIds,
  onChange,
  uploadFile,
}: UseFileAttachmentPickerStateParams): UseFileAttachmentPickerStateReturn => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleToggle = useCallback(
    (fileId: string, checked: boolean): void => {
      if (checked) {
        onChange([...selectedFileIds, fileId]);
      } else {
        onChange(selectedFileIds.filter((id) => id !== fileId));
      }
    },
    [selectedFileIds, onChange],
  );

  const handleFileUpload = useCallback(
    (file: File): void => {
      logger.info({ component: 'chat', action: 'file-attach-upload', message: 'Uploading file attachment', details: { filename: file.name, sizeBytes: file.size } });
      const metadata = {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      };

      const result = uploadFileSchema.safeParse(metadata);
      if (!result.success) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (): void => {
        const base64 = (reader.result as string).split(',')[1] ?? '';
        const data: UploadFileRequest = {
          ...result.data,
          storagePath: `/uploads/${file.name}`,
          content: base64,
        };
        uploadFile(data);
      };
      reader.readAsDataURL(file);
    },
    [uploadFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileUpload(selectedFile);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileUpload(droppedFile);
      }
    },
    [handleFileUpload],
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
    handleToggle,
    handleFileUpload,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    selectedCount,
  };
};
