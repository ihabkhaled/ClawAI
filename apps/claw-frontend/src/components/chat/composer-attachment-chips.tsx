import { ComposerAttachmentChip } from '@/components/chat/composer-attachment-chip';
import type { ComposerAttachmentChipsProps } from '@/types/composer-attachment.types';

/**
 * The strip of attachment chips above the composer toolbar. `aria-live`
 * polite, so a screen-reader user hears "Processing" turn into "Ready" (or
 * "Failed" and why) without the focus moving. Wraps rather than scrolls: a
 * failure reason must be readable at 360px, not clipped off the end of a row.
 */
export function ComposerAttachmentChips({
  chips,
  listLabel,
  onRemove,
}: ComposerAttachmentChipsProps): React.ReactElement | null {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div aria-live="polite" className="px-1" data-testid="composer-attachment-chips">
      <ul aria-label={listLabel} className="flex min-w-0 flex-wrap gap-1.5">
        {chips.map((chip) => (
          <ComposerAttachmentChip key={chip.key} chip={chip} onRemove={onRemove} />
        ))}
      </ul>
    </div>
  );
}
