'use client';

import { FolderOpen } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { FileChunksDialog } from '@/components/files/file-chunks-dialog';
import { FileListItem } from '@/components/files/file-list-item';
import { FileUploadZone } from '@/components/files/file-upload-zone';
import { Pagination } from '@/components/ui/pagination';
import { useFilesPage } from '@/hooks/files/use-files-page';

export default function FilesPage() {
  const {
    t,
    files,
    meta,
    page,
    pageSize,
    goToPage,
    setPageSize,
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
  } = useFilesPage();

  if (isError) {
    return (
      <div>
        <PageHeader title={t('files.title')} description={t('files.description')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive text-sm">{error?.message ?? t('files.loadFailed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('files.title')} description={t('files.description')} />

      <div className="mb-6">
        <FileUploadZone
          onFileSelected={handleFileSelected}
          isUploading={isUploadPending || uploadProgress > 0}
          validationError={fileValidationError}
          uploadProgress={uploadProgress}
          uploadingFilename={uploadingFilename}
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

      {meta !== undefined && meta.total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalPages={Math.max(meta.totalPages, 1)}
          totalItems={meta.total}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          t={t}
        />
      ) : null}

      <FileChunksDialog fileId={viewingChunksId} onClose={handleCloseChunks} />
    </div>
  );
}
