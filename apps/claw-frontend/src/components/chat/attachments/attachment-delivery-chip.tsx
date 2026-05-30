import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { AttachmentDeliveryChipProps } from '@/types';
import { buildFileDeliveryTooltip, countFileDeliveriesByMode } from '@/utilities';

// Pure presentational chip strip showing per-mode counts for one compare lane.
// Backed by chat-service's `metadata.fileDelivery` JSON (mirrored to FE on
// `ParallelModelResponse.attachmentDelivery`). One chip per mode that has at
// least one file, plus a native `title` tooltip listing every file + mode +
// reason so the user can drill into why a file was skipped/truncated.
//
// Allowed to call useTranslation directly: this is a leaf presentational
// component with no business logic and no other hooks. All non-render logic
// lives in `@/utilities/file-delivery.utility`.
export function AttachmentDeliveryChip({
  delivery,
}: AttachmentDeliveryChipProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (delivery.length === 0) {
    return null;
  }

  const counts = countFileDeliveriesByMode(delivery);
  const tooltip = buildFileDeliveryTooltip(delivery, t);

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      title={tooltip}
      aria-label={t('compare.delivery.tooltip')}
      data-testid="attachment-delivery-chip"
    >
      {counts.extracted > 0 ? (
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>📄</span>
          {t('compare.delivery.extractedText')} {String(counts.extracted)}
        </Badge>
      ) : null}
      {counts.image > 0 ? (
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🖼️</span>
          {t('compare.delivery.nativeImage')} {String(counts.image)}
        </Badge>
      ) : null}
      {counts.skipped > 0 ? (
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🚫</span>
          {t('compare.delivery.omittedNoVision')} {String(counts.skipped)}
        </Badge>
      ) : null}
      {counts.unsupported > 0 ? (
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>🚫</span>
          {t('compare.delivery.omittedUnsupported')} {String(counts.unsupported)}
        </Badge>
      ) : null}
      {counts.truncated > 0 ? (
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
          <span aria-hidden>✂️</span>
          {t('compare.delivery.truncatedText')} {String(counts.truncated)}
        </Badge>
      ) : null}
    </div>
  );
}
