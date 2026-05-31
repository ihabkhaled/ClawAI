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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null);

  const { files, isLoading, isError, error } = useFiles();
  const { uploadFile, isPending: isUploadPending } = useUploadFile();
  const { deleteFile, isPending: isDeletePending } = useDeleteFile();

  const handleFileSelected = useCallback(
    (file: File) => {
      logger.info({
        component: 'files',
        action: 'file-selected',
        message: 'File selected for upload',
        details: { filename: file.name, sizeBytes: file.size },
      });
      const metadata = {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      };

      const result = uploadFileSchema.safeParse(metadata);
      if (!result.success) {
        setFileValidationError(result.error.issues[0]?.message ?? 'Invalid file');
        return;
      }

      setFileValidationError(null);
      setUploadProgress(0);
      setUploadingFilename(file.name);

      // Read file content as base64 before uploading. Track the read progress
      // so the upload zone can show a real per-file progress bar. The actual
      // network upload is fire-and-forget after the read finishes; once the
      // FileReader hits 100% we hand off to the mutation which uses its
      // existing isPending state.
      const reader = new FileReader();
      reader.onprogress = (event): void => {
        if (event.lengthComputable && event.total > 0) {
          // FileReader read is ~80% of total perceived progress; the remaining
          // 20% covers the network round-trip handled by the mutation.
          const readPercent = (event.loaded / event.total) * 80;
          setUploadProgress(readPercent);
        }
      };
      reader.onload = (): void => {
        setUploadProgress(85);
        const base64 = (reader.result as string).split(',')[1] ?? '';
        const data: UploadFileRequest = {
          ...result.data,
          storagePath: `/uploads/${file.name}`,
          content: base64,
        };
        uploadFile(data, {
          onSettled: () => {
            setUploadProgress(0);
            setUploadingFilename(null);
          },
        });
      };
      reader.onerror = (): void => {
        setFileValidationError('Failed to read file');
        setUploadProgress(0);
        setUploadingFilename(null);
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
    uploadProgress,
    uploadingFilename,
    handleDelete,
    isDeletePending,
    viewingChunksId,
    handleViewChunks,
    handleCloseChunks,
  };
}
