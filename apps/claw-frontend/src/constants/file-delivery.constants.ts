import { FileDeliveryMode } from '@/enums';
import type { FileDeliveryBadgeSpec, FileDeliveryCounts, FileDeliveryCountKey } from '@/types';

// The one allow-list of delivery modes the FE accepts from chat-service —
// both `metadata.fileDelivery` and `GET /chat-messages/:id/file-delivery`
// narrow through `isFileDeliveryMode`, which reads this set. Derived from the
// enum so a new member is accepted everywhere the moment it is added.
export const FILE_DELIVERY_MODES: ReadonlySet<string> = new Set<string>(
  Object.values(FileDeliveryMode),
);

// i18n key per mode. `Record<FileDeliveryMode, …>` makes the map exhaustive:
// a new enum member without a label fails typecheck instead of silently
// rendering some other mode's label.
export const FILE_DELIVERY_MODE_LABEL_KEYS: Readonly<Record<FileDeliveryMode, string>> = {
  [FileDeliveryMode.EXTRACTED_TEXT]: 'compare.delivery.extractedText',
  [FileDeliveryMode.NATIVE_IMAGE]: 'compare.delivery.nativeImage',
  [FileDeliveryMode.OMITTED_NO_VISION]: 'compare.delivery.omittedNoVision',
  [FileDeliveryMode.OMITTED_UNSUPPORTED]: 'compare.delivery.omittedUnsupported',
  [FileDeliveryMode.TRUNCATED_TEXT]: 'compare.delivery.truncatedText',
  [FileDeliveryMode.TRANSCRIPT]: 'compare.delivery.transcript',
  [FileDeliveryMode.STILL_PROCESSING]: 'compare.delivery.stillProcessing',
  [FileDeliveryMode.FAILED_PROCESSING]: 'compare.delivery.failedProcessing',
  [FileDeliveryMode.NATIVE_VIDEO]: 'compare.delivery.nativeVideo',
};

// Which FileDeliveryCounts bucket each mode increments. Exhaustive for the
// same reason as the label map.
export const FILE_DELIVERY_MODE_COUNT_KEYS: Readonly<
  Record<FileDeliveryMode, FileDeliveryCountKey>
> = {
  [FileDeliveryMode.EXTRACTED_TEXT]: 'extracted',
  [FileDeliveryMode.NATIVE_IMAGE]: 'image',
  [FileDeliveryMode.OMITTED_NO_VISION]: 'skipped',
  [FileDeliveryMode.OMITTED_UNSUPPORTED]: 'unsupported',
  [FileDeliveryMode.TRUNCATED_TEXT]: 'truncated',
  [FileDeliveryMode.TRANSCRIPT]: 'transcript',
  [FileDeliveryMode.STILL_PROCESSING]: 'processing',
  [FileDeliveryMode.FAILED_PROCESSING]: 'failed',
  [FileDeliveryMode.NATIVE_VIDEO]: 'video',
};

// Zeroed counts. Spread it — never mutate it.
export const FILE_DELIVERY_EMPTY_COUNTS: Readonly<FileDeliveryCounts> = {
  extracted: 0,
  image: 0,
  skipped: 0,
  unsupported: 0,
  truncated: 0,
  transcript: 0,
  video: 0,
  processing: 0,
  failed: 0,
};

// Badge render order for AttachmentDeliveryChip. Every badge carries a text
// label (from its mode) — the icon is decorative, so processing/failed never
// rely on color or glyph alone.
export const FILE_DELIVERY_BADGE_SPECS: readonly FileDeliveryBadgeSpec[] = [
  { countKey: 'extracted', mode: FileDeliveryMode.EXTRACTED_TEXT, icon: '📄' },
  { countKey: 'image', mode: FileDeliveryMode.NATIVE_IMAGE, icon: '🖼️' },
  { countKey: 'video', mode: FileDeliveryMode.NATIVE_VIDEO, icon: '🎬' },
  { countKey: 'transcript', mode: FileDeliveryMode.TRANSCRIPT, icon: '🎙️' },
  { countKey: 'skipped', mode: FileDeliveryMode.OMITTED_NO_VISION, icon: '🚫' },
  { countKey: 'unsupported', mode: FileDeliveryMode.OMITTED_UNSUPPORTED, icon: '🚫' },
  { countKey: 'truncated', mode: FileDeliveryMode.TRUNCATED_TEXT, icon: '✂️' },
  { countKey: 'processing', mode: FileDeliveryMode.STILL_PROCESSING, icon: '⏳' },
  { countKey: 'failed', mode: FileDeliveryMode.FAILED_PROCESSING, icon: '⚠️' },
];
