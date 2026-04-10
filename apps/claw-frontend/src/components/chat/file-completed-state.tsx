import { Download, FileText } from 'lucide-react';

import type { FileCompletedStateProps } from '@/types';
import { formatFileSizeLabel } from '@/utilities';

export function FileCompletedState({
  blobUrl,
  filename,
  format,
  sizeBytes,
}: FileCompletedStateProps): React.ReactElement {
  const sizeLabel = sizeBytes ? formatFileSizeLabel(sizeBytes) : '';

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{filename}</div>
          <div className="text-xs text-muted-foreground">
            {format.toUpperCase()}
            {sizeLabel ? ` \u00b7 ${sizeLabel}` : ''}
          </div>
        </div>
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          download={filename}
          href={blobUrl}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}
