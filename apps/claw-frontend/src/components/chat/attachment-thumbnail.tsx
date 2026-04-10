import { FileText } from 'lucide-react';

import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import type { AttachmentThumbnailProps } from '@/types';

export function AttachmentThumbnail({ fileId }: AttachmentThumbnailProps): React.ReactElement {
  const blobUrl = useAuthenticatedImage(`/api/v1/files/download/${fileId}`);

  if (blobUrl) {
    return (
      <a
        className="block overflow-hidden rounded-lg border border-border"
        href={blobUrl}
        rel="noreferrer"
        target="_blank"
      >
        <img
          alt="Attached file"
          className="h-20 w-20 object-cover"
          src={blobUrl}
        />
      </a>
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted">
      <FileText className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}
