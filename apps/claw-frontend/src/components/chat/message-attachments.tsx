import { MessageAttachmentItem } from '@/components/chat/message-attachment-item';

export function MessageAttachments({ fileIds }: { fileIds: string[] }) {
  if (fileIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
      {fileIds.map((fileId) => (
        <MessageAttachmentItem key={fileId} fileId={fileId} />
      ))}
    </div>
  );
}
