import { Upload } from 'lucide-react';

import { useFileUploadZoneState } from '@/hooks/files/use-file-upload-zone-state';
import { cn } from '@/lib/utils';
import type { FileUploadZoneProps } from '@/types';

export function FileUploadZone({
  onFileSelected,
  isUploading,
  validationError,
}: FileUploadZoneProps) {
  const {
    isDragOver,
    inputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    handleClick,
  } = useFileUploadZoneState(onFileSelected, isUploading);

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
        'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:min-h-[160px] sm:p-6',
        isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        isUploading && 'cursor-not-allowed opacity-50',
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {isUploading ? 'Uploading...' : 'Drop a file here or click to browse'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">All file types accepted (max 50 MB)</p>
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
