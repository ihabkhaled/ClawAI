// File-delivery mode for compare-mode attachments. Mirrors the SHARED CONTRACT
// `FileDeliveryMode` enum produced by chat-service when assembling a
// per-lane prompt for `/chat-messages/parallel`. Surfaced to the FE via
// `ParallelModelResponse.attachmentDelivery[*].mode` so the UI can show
// per-model delivery indicators (e.g. "extracted text", "native image",
// "omitted — no vision", "truncated for token budget").
export enum FileDeliveryMode {
  // Text decoded from a text/* / json/csv/markdown file, injected into the
  // system block.
  EXTRACTED_TEXT = 'EXTRACTED_TEXT',
  // image_url part (cloud) or native images:[base64] (Ollama) — model has
  // vision.
  NATIVE_IMAGE = 'NATIVE_IMAGE',
  // Image attached, but model has no vision support — silently dropped from
  // this lane's prompt.
  OMITTED_NO_VISION = 'OMITTED_NO_VISION',
  // Unrecognised mime / binary / oversize — could not deliver to this lane.
  OMITTED_UNSUPPORTED = 'OMITTED_UNSUPPORTED',
  // Text was injected but had to be cut for token budget.
  TRUNCATED_TEXT = 'TRUNCATED_TEXT',
}
