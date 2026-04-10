import { AttachmentThumbnail } from '@/components/chat/attachment-thumbnail';

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
