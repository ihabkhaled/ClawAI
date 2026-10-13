import { File as FileIcon, Loader2 } from 'lucide-react';

import { useFilePreviewUrl } from '@/hooks/files/use-file-preview-url';
import type { FileLibraryUploadTileProps } from '@/types/file-library-ui.types';

/**
 * A file the dialog just handed to the upload pipeline: a local preview of the
 * image (revoked when the tile goes), or a plain file mark, with a spinner until
 * the server has it. The real progress readout is the composer tray's.
 */
export function FileLibraryUploadTile({
  file,
  uploadingLabel,
}: FileLibraryUploadTileProps): React.ReactElement {
  const { previewUrl, handleError } = useFilePreviewUrl(file);

  return (
    <li
      className="bg-muted/40 flex min-w-0 items-center gap-3 rounded-lg border border-dashed p-1.5"
      aria-busy="true"
      title={file.name}
      data-testid="file-library-upload-tile"
    >
      <span className="bg-muted relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        {previewUrl === null ? (
          <FileIcon className="text-muted-foreground h-5 w-5" aria-hidden="true" />
        ) : (
          <img
            alt=""
            src={previewUrl}
            className="h-full w-full object-cover"
            onError={handleError}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{file.name}</span>
        <span className="text-muted-foreground text-xs">{uploadingLabel}</span>
      </span>
      <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
    </li>
  );
}
