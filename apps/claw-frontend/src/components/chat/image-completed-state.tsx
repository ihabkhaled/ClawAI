import { Download, ExternalLink } from 'lucide-react';

import type { ImageCompletedStateProps } from '@/types';

export function ImageCompletedState({
  blobUrl,
  prompt,
}: ImageCompletedStateProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-border p-3">
      <img alt={prompt} className="max-h-[512px] w-full rounded-lg object-cover" src={blobUrl} />
      <div className="mt-2 flex items-center gap-2">
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          download="generated-image.png"
          href={blobUrl}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          href={blobUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      </div>
    </div>
  );
}
