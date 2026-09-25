import type { FileDeliveryMode } from '@/enums';

// Per-file delivery record for a single compare-mode lane (provider+model).
// Mirrors the SHARED CONTRACT shape written by chat-service into
// ASSISTANT message `metadata.fileDelivery` and surfaced to the FE via
// `ParallelModelResponse.attachmentDelivery`. Backs the per-model delivery
// indicators on the compare results grid + in-thread compare panel.
export type FileDeliveryEntry = {
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  mode: FileDeliveryMode;
  // Optional i18n key or human-readable string explaining OMITTED / TRUNCATED.
  reason?: string;
  // DERIVED_IMAGE_TEXT only: the vision helper that described the image. The
  // entry's provider/model stay the answering model's.
  helperProvider?: string;
  helperModel?: string;
  // VIDEO_FRAMES_AND_TRANSCRIPT only: the moments (ms from the start) whose
  // frames reached the model. Empty/absent = transcript only.
  frameTimestampsMs?: number[];
};

// Aggregated counts per delivery mode. Produced by
// `countFileDeliveriesByMode` and consumed by `AttachmentDeliveryChip` to
// render one badge per non-zero count.
export type FileDeliveryCounts = {
  extracted: number;
  image: number;
  skipped: number;
  unsupported: number;
  truncated: number;
  transcript: number;
  video: number;
  processing: number;
  failed: number;
  described: number;
  videoFrames: number;
};

// One bucket name of FileDeliveryCounts.
export type FileDeliveryCountKey = keyof FileDeliveryCounts;

// Static render spec for one chip badge: which count it shows, which mode
// supplies its text label, and a decorative icon.
export type FileDeliveryBadgeSpec = {
  countKey: FileDeliveryCountKey;
  mode: FileDeliveryMode;
  icon: string;
};

// A resolved, non-zero badge ready to render: localized label + count.
export type FileDeliveryBadge = {
  countKey: FileDeliveryCountKey;
  icon: string;
  label: string;
  count: number;
};

// Options for `useFileDelivery`. `enabled` defaults to true; callers can set
// it to false to opt out of the network fetch (e.g. when no messageId is
// available yet, or while the caller wants to rely solely on the inline
// metadata fallback during streaming).
export type UseFileDeliveryOptions = {
  enabled?: boolean;
};

// Shape returned by `useFileDelivery`. `entries` is always an array — empty
// while loading, disabled, or after a 404 — so callers can fall back to the
// inline `metadata.fileDelivery` reader without branching on undefined.
export type UseFileDeliveryResult = {
  entries: FileDeliveryEntry[];
  isLoading: boolean;
  error: unknown;
};

// Raw shape returned by chat-service's `GET /chat-messages/:id/file-delivery`.
// Mirrors the `FileDeliveryRecord` Prisma row (file_delivery_records) so the
// mapper in the repository layer can narrow the wire string into our FE
// FileDeliveryMode enum.
export type FileDeliveryRecordWire = {
  id: string;
  messageId: string;
  threadId: string;
  userId: string;
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  mode: string;
  supportsVision: boolean;
  createdAt: string;
};

// Translator signature used inside the FE i18n utilities. Local alias avoids
// an import cycle through the heavier i18n types.
export type FileDeliveryTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;
