import { CloudUpload, Loader2, Upload } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { useFileUploadZoneState } from '@/hooks/files/use-file-upload-zone-state';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { FileUploadZoneProps } from '@/types';

export function FileUploadZone({
  onFileSelected,
  isUploading,
  validationError,
  uploadProgress,
  uploadingFilename,
}: FileUploadZoneProps) {
  const { t } = useTranslation();
  const {
    isDragOver,
    inputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    handleClick,
  } = useFileUploadZoneState(onFileSelected, isUploading);

  // When uploading we render an alternate, calmer state with a progress bar.
  if (isUploading) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center sm:min-h-[160px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="w-full max-w-sm space-y-1.5">
          <p className="truncate text-sm font-medium">
            {uploadingFilename ?? t('files.uploading')}
          </p>
          {typeof uploadProgress === 'number' ? (
            <>
              <Progress value={uploadProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t('files.uploading')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={cn(
        'group flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all sm:min-h-[160px] sm:p-6',
        isDragOver
          ? 'border-primary bg-primary/10 scale-[1.01] shadow-sm'
          : 'border-border hover:border-primary/60 hover:bg-muted/30',
      )}
    >
      {isDragOver ? (
        <CloudUpload className="mb-3 h-9 w-9 text-primary" aria-hidden="true" />
      ) : (
        <Upload
          className="mb-3 h-8 w-8 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      )}
      <p
        className={cn(
          'text-sm font-medium',
          isDragOver ? 'text-primary' : 'text-foreground',
        )}
      >
        {isDragOver ? t('files.dropFileHere') : t('files.dropOrClick')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t('files.allTypesAccepted')}</p>
      {validationError ? <p className="mt-2 text-sm text-destructive">{validationError}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />
    </div>
  );
}
