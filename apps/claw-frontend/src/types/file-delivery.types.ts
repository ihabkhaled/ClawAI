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
};
