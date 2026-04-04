"use client";

import { FolderOpen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { FileChunksDialog } from "@/components/files/file-chunks-dialog";
import { FileListItem } from "@/components/files/file-list-item";
import { FileUploadZone } from "@/components/files/file-upload-zone";
import { useFilesPage } from "@/hooks/files/use-files-page";

export default function FilesPage() {
  const {
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
  } = useFilesPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Files"
          description="Upload and manage files for AI context and retrieval"
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to load files."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Files"
        description="Upload and manage files for AI context and retrieval"
      />

      <div className="mb-6">
        <FileUploadZone
          onFileSelected={handleFileSelected}
          isUploading={isUploadPending}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading files..." />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files uploaded"
          description="Upload documents, code, or other files to use as context in your AI conversations and for retrieval-augmented generation."
        />
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <FileListItem
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onViewChunks={handleViewChunks}
              isDeletePending={isDeletePending}
            />
          ))}
        </div>
      )}

      <FileChunksDialog
        fileId={viewingChunksId}
        onClose={handleCloseChunks}
      />
    </div>
  );
}
