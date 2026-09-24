import { useMessageAttachmentItem } from '@/hooks/chat/use-message-attachment-item';
import type { MessageAttachmentItemProps } from '@/types/archive.types';

import { ArchiveAttachmentCard } from './archive-attachment-card';
import { AttachmentPlaceholder } from './attachment-placeholder';
import { AttachmentThumbnail } from './attachment-thumbnail';

// Asks once (cached) whether the attachment is an archive before drawing it:
// the thumbnail downloads the file's bytes, which for a 50 MB archive is
// exactly the wrong thing to do just to show an icon.
export function MessageAttachmentItem({ fileId }: MessageAttachmentItemProps): React.ReactElement {
  const ctrl = useMessageAttachmentItem(fileId);

  if (ctrl.isResolving) {
    return <AttachmentPlaceholder />;
  }
  if (ctrl.listing !== undefined) {
    return (
      <ArchiveAttachmentCard
        listing={ctrl.listing}
        rejection={ctrl.rejection}
        isExpanded={ctrl.isExpanded}
        onToggle={ctrl.toggleExpanded}
        passwordPrompt={ctrl.passwordPrompt}
        t={ctrl.t}
      />
    );
  }
  return <AttachmentThumbnail fileId={fileId} />;
}
