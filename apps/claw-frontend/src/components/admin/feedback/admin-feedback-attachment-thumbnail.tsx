'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useFeedbackAttachmentUrl } from '@/hooks/admin/feedback/use-feedback-attachment-url';
import type { AdminFeedbackAttachmentThumbnailProps } from '@/types/feedback-props.types';

// A bare 64px square told the admin nothing about which file they were about to
// open, so the tile carries the filename under the image and the button is
// sized to the tile instead of the icon.
export function AdminFeedbackAttachmentThumbnail({
  ticketId,
  attachment,
  onOpen,
}: AdminFeedbackAttachmentThumbnailProps): ReactElement {
  const url = useFeedbackAttachmentUrl(ticketId, attachment.fileId);

  return (
    <Button
      variant="outline"
      className="hover:border-primary/60 h-auto w-28 flex-col gap-2 p-2"
      disabled={url === null}
      title={attachment.filename}
      onClick={() => {
        if (url !== null) {
          onOpen(url, attachment.filename);
        }
      }}
    >
      {url === null ? (
        <span className="bg-muted h-20 w-full animate-pulse rounded" aria-hidden="true" />
      ) : (
        <img src={url} alt={attachment.filename} className="h-20 w-full rounded object-cover" />
      )}
      <span className="text-muted-foreground w-full truncate text-center text-xs font-normal">
        {attachment.filename}
      </span>
    </Button>
  );
}
