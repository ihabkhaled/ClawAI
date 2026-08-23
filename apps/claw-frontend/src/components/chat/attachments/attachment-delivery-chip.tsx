import { Badge } from '@/components/ui/badge';
import { useAttachmentDeliveryChip } from '@/hooks/chat/use-attachment-delivery-chip';
import { useTranslation } from '@/lib/i18n';
import type { AttachmentDeliveryChipProps } from '@/types';
import { buildFileDeliveryTooltip, countFileDeliveriesByMode } from '@/utilities';

// Pure presentational chip strip showing per-mode counts for one compare lane.
// Backed by chat-service's `file_delivery_records` table (Slice D dual-read):
// when a `messageId` is provided we fetch fresh, authoritative rows via the
// `useAttachmentDeliveryChip` controller hook; otherwise we fall back to the
// inline `delivery` array (mirror of `metadata.fileDelivery` on the assistant
// message, populated by ParallelExecutionManager).
//
// Allowed to call useTranslation directly: this is a leaf presentational
// component with no business logic and no other hooks. All non-render logic
// lives in `@/utilities/file-delivery.utility` + `useAttachmentDeliveryChip`.
export function AttachmentDeliveryChip({
  delivery,
  messageId,
}: AttachmentDeliveryChipProps): React.ReactElement | null {
  const { t } = useTranslation();
  const resolved = useAttachmentDeliveryChip(delivery, messageId);

  if (resolved.length === 0) {
    return null;
  }

  const counts = countFileDeliveriesByMode(resolved);
  const tooltip = buildFileDeliveryTooltip(resolved, t);

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      title={tooltip}
      aria-label={t('compare.delivery.tooltip')}
      data-testid="attachment-delivery-chip"
    >
      {counts.extracted > 0 ? (
        <Badge variant="outline" className="touch:text-xs gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>📄</span>
          {t('compare.delivery.extractedText')} {String(counts.extracted)}
        </Badge>
      ) : null}
      {counts.image > 0 ? (
        <Badge variant="outline" className="touch:text-xs gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🖼️</span>
          {t('compare.delivery.nativeImage')} {String(counts.image)}
        </Badge>
      ) : null}
      {counts.skipped > 0 ? (
        <Badge variant="outline" className="touch:text-xs gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🚫</span>
          {t('compare.delivery.omittedNoVision')} {String(counts.skipped)}
        </Badge>
      ) : null}
      {counts.unsupported > 0 ? (
        <Badge variant="outline" className="touch:text-xs gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🚫</span>
          {t('compare.delivery.omittedUnsupported')} {String(counts.unsupported)}
        </Badge>
      ) : null}
      {counts.truncated > 0 ? (
        <Badge variant="outline" className="touch:text-xs gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>✂️</span>
          {t('compare.delivery.truncatedText')} {String(counts.truncated)}
        </Badge>
      ) : null}
    </div>
  );
}
