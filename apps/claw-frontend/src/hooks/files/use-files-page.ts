import { useState, useCallback } from "react";

import type { UploadFileRequest } from "@/types";

import { useDeleteFile } from "./use-delete-file";
import { useFiles } from "./use-files";
import { useUploadFile } from "./use-upload-file";

export function useFilesPage() {
  const [viewingChunksId, setViewingChunksId] = useState<string | null>(null);

  const { files, isLoading, isError, error } = useFiles();
  const { uploadFile, isPending: isUploadPending } = useUploadFile();
  const { deleteFile, isPending: isDeletePending } = useDeleteFile();

  const handleFileSelected = useCallback(
    (file: File) => {
      const data: UploadFileRequest = {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: `/uploads/${file.name}`,
      };
      uploadFile(data);
    },
    [uploadFile],
  );

  const handleDelete = (id: string) => {
    deleteFile(id);
  };

  const handleViewChunks = (id: string) => {
    setViewingChunksId(id);
  };

  const handleCloseChunks = () => {
    setViewingChunksId(null);
  };

  return {
    files,
    isLoading,
    isError,
    error,
    handleFileSelected,
    isUploadPending,
    handleDelete,
    isDeletePending,
    viewingChunksId,
    handleViewChunks,
    handleCloseChunks,
  };
}
