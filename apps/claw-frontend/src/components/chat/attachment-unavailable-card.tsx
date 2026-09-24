import { ImageOff } from 'lucide-react';

import type { AttachmentUnavailableCardProps } from '@/types/attachment-preview.types';

/**
 * What an image attachment degrades to when it can no longer be shown —
 * expired, deleted, unauthorised, or undecodable. Same footprint as the file
 * card so the bubble does not jump, and it states the reason instead of
 * showing a broken `<img>`.
 */
export function AttachmentUnavailableCard({
  label,
  unavailableLabel,
}: AttachmentUnavailableCardProps): React.ReactElement {
  return (
    <div
      className="bg-card flex w-full min-w-0 items-center gap-2 rounded-lg border p-2 sm:w-64"
      data-testid="attachment-unavailable"
    >
      <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium" title={label}>
          {label}
        </span>
        <span className="text-muted-foreground text-[11px]">{unavailableLabel}</span>
      </span>
    </div>
  );
}
