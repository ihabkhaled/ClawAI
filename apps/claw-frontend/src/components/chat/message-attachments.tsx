import { FileText } from 'lucide-react';

import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';

export function MessageAttachments({ fileIds }: { fileIds: string[] }) {
  if (fileIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {fileIds.map((fileId) => (
        <AttachmentThumbnail key={fileId} fileId={fileId} />
      ))}
    </div>
  );
}

function AttachmentThumbnail({ fileId }: { fileId: string }) {
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
