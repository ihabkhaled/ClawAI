import { useState, useCallback } from 'react';

import { uploadFileSchema } from '@/lib/validation/file.schema';
import type { UploadFileRequest } from '@/types';
import { logger } from '@/utilities';

import { useDeleteFile } from './use-delete-file';
import { useFiles } from './use-files';
import { useUploadFile } from './use-upload-file';

export function useFilesPage() {
  const [viewingChunksId, setViewingChunksId] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const { files, isLoading, isError, error } = useFiles();
  const { uploadFile, isPending: isUploadPending } = useUploadFile();
  const { deleteFile, isPending: isDeletePending } = useDeleteFile();

  const handleFileSelected = useCallback(
    (file: File) => {
      logger.info({ component: 'files', action: 'file-selected', message: 'File selected for upload', details: { filename: file.name, sizeBytes: file.size } });
      const metadata = {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      };

      const result = uploadFileSchema.safeParse(metadata);
      if (!result.success) {
        setFileValidationError(result.error.errors[0]?.message ?? 'Invalid file');
        return;
      }

      setFileValidationError(null);

      // Read file content as base64 before uploading
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
      reader.onerror = (): void => {
        setFileValidationError('Failed to read file');
      };
      reader.readAsDataURL(file);
    },
    [uploadFile],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteFile(id);
    },
    [deleteFile],
  );

  const handleViewChunks = useCallback((id: string) => {
    setViewingChunksId(id);
  }, []);

  const handleCloseChunks = useCallback(() => {
    setViewingChunksId(null);
  }, []);

  return {
    files,
    isLoading,
    isError,
    error,
    handleFileSelected,
    isUploadPending,
    fileValidationError,
    handleDelete,
    isDeletePending,
    viewingChunksId,
    handleViewChunks,
    handleCloseChunks,
  };
}
