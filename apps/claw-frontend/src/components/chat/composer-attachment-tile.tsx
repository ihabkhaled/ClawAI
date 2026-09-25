import { X } from 'lucide-react';

import { AttachmentMediaPreview } from '@/components/chat/attachment-media-preview';
import { AttachmentPlaceholder } from '@/components/chat/attachment-placeholder';
import { AttachmentThumbnail } from '@/components/chat/attachment-thumbnail';
import { Button } from '@/components/ui/button';
import { useComposerAttachmentTile } from '@/hooks/chat/use-composer-attachment-tile';
import type { ComposerAttachmentTileProps } from '@/types/composer-attachment.types';

/**
 * One attached file above the composer's textarea: an image as a thumbnail, a
 * voice or video note as a player (nothing downloads until Play), anything
 * else as its type icon, name and size — plus a remove (x) button reachable by
 * keyboard. The remove button sits on the inline-end corner, so it lands on
 * the correct side in RTL without a mirrored twin.
 */
export function ComposerAttachmentTile({
  fileId,
  onRemove,
  disabled,
  status,
}: ComposerAttachmentTileProps): React.ReactElement {
  const tile = useComposerAttachmentTile(fileId);

  return (
    <li className="relative max-w-full" data-testid="composer-attachment-tile" title={tile.label}>
      {tile.showPlaceholder ? <AttachmentPlaceholder /> : null}
      {tile.showImage && tile.file !== undefined ? (
        <AttachmentThumbnail fileId={fileId} filename={tile.file.filename} />
      ) : null}
      {tile.showMedia && tile.file !== undefined && tile.mediaKind !== null ? (
        <AttachmentMediaPreview
          fileId={fileId}
          filename={tile.file.filename}
          mimeType={tile.file.mimeType}
          kind={tile.mediaKind}
        />
      ) : null}
      {tile.showDocument && tile.file !== undefined ? (
        <div className="bg-card flex h-14 w-40 max-w-full min-w-0 items-center gap-2 rounded-lg border p-2 pe-6 sm:h-20 sm:w-56">
          {tile.descriptor === null ? null : (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${tile.descriptor.tone}`}
            >
              <tile.descriptor.Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{tile.file.filename}</span>
            <span className="text-muted-foreground text-xs">{tile.sizeLabel}</span>
          </span>
        </div>
      ) : null}
      {status === undefined ? null : (
        <p
          className="text-muted-foreground mt-1 max-w-56 text-xs break-words"
          data-testid="composer-attachment-status"
        >
          {status}
        </p>
      )}
      <Button
        type="button"
        variant="unstyled"
        size="unstyled"
        onClick={() => onRemove(fileId)}
        disabled={disabled}
        aria-label={tile.removeLabel}
        title={tile.removeLabel}
        className="focus-visible:ring-ring absolute -end-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        data-testid="composer-attachment-remove"
      >
        {/* A small visible circle inside a larger hit area: on touch the
            global 44px floor applies to the button, not to this dot. */}
        <span className="bg-foreground text-background flex h-6 w-6 items-center justify-center rounded-full shadow-sm">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Button>
    </li>
  );
}
