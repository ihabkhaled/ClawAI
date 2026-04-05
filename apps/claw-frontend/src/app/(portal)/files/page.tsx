'use client';

import { FolderOpen } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { FileChunksDialog } from '@/components/files/file-chunks-dialog';
import { FileListItem } from '@/components/files/file-list-item';
import { FileUploadZone } from '@/components/files/file-upload-zone';
import { useFilesPage } from '@/hooks/files/use-files-page';
import { useTranslation } from '@/lib/i18n';

export default function FilesPage() {
  const {
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
  } = useFilesPage();

  const { t } = useTranslation();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('files.title')}
          description={t('files.description')}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">{error?.message ?? t('files.loadFailed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('files.title')}
        description={t('files.description')}
      />

      <div className="mb-6">
        <FileUploadZone
          onFileSelected={handleFileSelected}
          isUploading={isUploadPending}
          validationError={fileValidationError}
        />
      </div>

      {isLoading && <LoadingSpinner label={t('files.loadingFiles')} />}

      {!isLoading && files.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={t('files.noFiles')}
          description={t('files.noFilesDesc')}
        />
      )}

      {!isLoading && files.length > 0 && (
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

      <FileChunksDialog fileId={viewingChunksId} onClose={handleCloseChunks} />
    </div>
  );
}
