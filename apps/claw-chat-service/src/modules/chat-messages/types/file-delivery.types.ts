import type { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';

// Per-file delivery telemetry, persisted on the ASSISTANT message's
// metadata.fileDelivery JSON and mirrored on ParallelModelResponse.
// The judge + critic prompts inject this so they can fairly evaluate file
// grounding (and not penalize lanes whose mode === OMITTED_*).
export type FileDeliveryEntry = {
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  mode: FileDeliveryMode;
  // Human / i18n key explaining WHY the file was OMITTED or TRUNCATED.
  // Left undefined for EXTRACTED_TEXT / NATIVE_IMAGE successes.
  reason?: string;
  // DERIVED_IMAGE_TEXT only: the helper that described the image (ADR-120
  // batch 5). The entry's provider/model stay the lane's own model.
  helperProvider?: string;
  helperModel?: string;
};
