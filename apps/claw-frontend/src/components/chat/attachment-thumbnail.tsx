import { useAttachmentThumbnail } from '@/hooks/chat/use-attachment-thumbnail';
import type { AttachmentThumbnailProps } from '@/types';

import { AttachmentPlaceholder } from './attachment-placeholder';
import { AttachmentUnavailableCard } from './attachment-unavailable-card';

export function AttachmentThumbnail({
  fileId,
  filename,
}: AttachmentThumbnailProps): React.ReactElement {
  const { t, blobUrl, isUnavailable, handleImageError } = useAttachmentThumbnail(fileId);
  const label = filename ?? t('chat.attachedFile');

  if (isUnavailable) {
    return (
      <AttachmentUnavailableCard
        label={label}
        unavailableLabel={t('chat.attachment.unavailable')}
      />
    );
  }

  if (blobUrl) {
    return (
      <a
        className="border-border block overflow-hidden rounded-lg border"
        href={blobUrl}
        rel="noreferrer"
        target="_blank"
      >
        <img
          alt={label}
          className="h-20 w-20 object-cover"
          src={blobUrl}
          onError={handleImageError}
        />
      </a>
    );
  }

  return <AttachmentPlaceholder />;
}
