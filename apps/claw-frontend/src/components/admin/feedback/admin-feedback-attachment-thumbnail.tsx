'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useFeedbackAttachmentUrl } from '@/hooks/admin/feedback/use-feedback-attachment-url';
import type { AdminFeedbackAttachmentThumbnailProps } from '@/types/feedback-props.types';

export function AdminFeedbackAttachmentThumbnail({
  ticketId,
  attachment,
  onOpen,
}: AdminFeedbackAttachmentThumbnailProps): ReactElement {
  const url = useFeedbackAttachmentUrl(ticketId, attachment.fileId);

  return (
    <Button
      variant="outline"
      className="h-auto p-2"
      disabled={url === null}
      onClick={() => {
        if (url !== null) {
          onOpen(url, attachment.filename);
        }
      }}
    >
      {url === null ? (
        <span className="bg-muted h-16 w-16 animate-pulse rounded" aria-hidden="true" />
      ) : (
        <img
          src={url}
          alt={attachment.filename}
          title={attachment.filename}
          className="h-16 w-16 rounded object-cover"
        />
      )}
    </Button>
  );
}
