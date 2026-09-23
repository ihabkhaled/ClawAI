import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useTranslation } from '@/lib/i18n';
import type { AttachmentThumbnailProps } from '@/types';

import { AttachmentPlaceholder } from './attachment-placeholder';

export function AttachmentThumbnail({ fileId }: AttachmentThumbnailProps): React.ReactElement {
  const { t } = useTranslation();
  const blobUrl = useAuthenticatedImage(`/api/v1/files/download/${fileId}`);

  if (blobUrl) {
    return (
      <a
        className="border-border block overflow-hidden rounded-lg border"
        href={blobUrl}
        rel="noreferrer"
        target="_blank"
      >
        <img alt={t('chat.attachedFile')} className="h-20 w-20 object-cover" src={blobUrl} />
      </a>
    );
  }

  return <AttachmentPlaceholder />;
}
