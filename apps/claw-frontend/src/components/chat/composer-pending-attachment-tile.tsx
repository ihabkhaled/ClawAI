import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFilePreviewUrl } from '@/hooks/files/use-file-preview-url';
import { cn } from '@/lib/utils';
import type { ComposerPendingAttachmentTileProps } from '@/types/composer-attachment.types';
import { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';
import { formatFileSize } from '@/utilities/format.utility';

/**
 * A file still uploading: its name, its size, and a spinner — plus the live
 * percentage when this is the upload the progress readout is tracking (the
 * pipeline reports one active upload at a time; the others show the spinner).
 *
 * The cancel (x) takes the file back mid-upload: the upload is aborted (no
 * further chunk is sent, the server session is deleted) and the tile goes.
 * Same inline-end corner and hit area as a selected file's remove button.
 */
export function ComposerPendingAttachmentTile({
  upload,
  progress,
  onCancel,
  cancelLabel,
}: ComposerPendingAttachmentTileProps): React.ReactElement {
  const { previewUrl, showFallbackIcon, handleError } = useFilePreviewUrl(upload.file);
  const { Icon: TypeIcon, tone } = getFileTypeDescriptor(upload.mimeType, upload.filename);
  const percent =
    progress !== null && progress.totalBytes === upload.sizeBytes
      ? Math.round(progress.percent)
      : null;

  return (
    <li
      className="bg-muted/50 relative flex h-14 w-40 max-w-full min-w-0 items-center gap-2 rounded-lg border border-dashed p-2 sm:h-20 sm:w-56"
      data-testid="composer-pending-attachment-tile"
      aria-busy="true"
      title={upload.filename}
    >
      {previewUrl === null && showFallbackIcon ? (
        <span
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-14 sm:w-14',
            tone,
          )}
          data-testid="composer-pending-attachment-icon"
        >
          <TypeIcon className="h-5 w-5" aria-hidden="true" />
          <Loader2
            className="absolute -end-0.5 -bottom-0.5 h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />
        </span>
      ) : null}
      {previewUrl === null && !showFallbackIcon ? (
        <Loader2
          className="text-muted-foreground h-5 w-5 shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {previewUrl === null ? null : (
        <span
          className="bg-muted relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-14 sm:w-14"
          data-testid="composer-pending-attachment-preview"
        >
          <img
            alt=""
            src={previewUrl}
            className="h-full w-full object-cover"
            onError={handleError}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
          </span>
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{upload.filename}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {percent === null
            ? formatFileSize(upload.sizeBytes)
            : `${String(percent)}% · ${formatFileSize(upload.sizeBytes)}`}
        </span>
      </span>
      {onCancel === undefined ? null : (
        <Button
          type="button"
          variant="unstyled"
          size="unstyled"
          onClick={() => onCancel(upload.key)}
          aria-label={cancelLabel}
          title={cancelLabel}
          className="focus-visible:ring-ring absolute -end-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
          data-testid="composer-pending-attachment-cancel"
        >
          <span className="bg-foreground text-background flex h-6 w-6 items-center justify-center rounded-full shadow-sm">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </Button>
      )}
    </li>
  );
}
