import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ComposerPendingAttachmentTileProps } from '@/types/composer-attachment.types';
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
      <Loader2 className="text-muted-foreground h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
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
