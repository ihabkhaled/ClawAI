import { Loader2 } from 'lucide-react';

import type { ComposerPendingAttachmentTileProps } from '@/types/composer-attachment.types';
import { formatFileSize } from '@/utilities/format.utility';

/**
 * A file still uploading: its name, its size, and a spinner — plus the live
 * percentage when this is the upload the progress readout is tracking (the
 * pipeline reports one active upload at a time; the others show the spinner).
 */
export function ComposerPendingAttachmentTile({
  upload,
  progress,
}: ComposerPendingAttachmentTileProps): React.ReactElement {
  const percent =
    progress !== null && progress.totalBytes === upload.sizeBytes
      ? Math.round(progress.percent)
      : null;

  return (
    <li
      className="bg-muted/50 flex h-14 w-40 max-w-full min-w-0 items-center gap-2 rounded-lg border border-dashed p-2 sm:h-20 sm:w-56"
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
    </li>
  );
}
