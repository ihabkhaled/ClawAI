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
  // Image attached, but model has no vision support — the bytes are withheld
  // and the lane gets its OCR text or an honest "cannot see it" note.
  OMITTED_NO_VISION = 'OMITTED_NO_VISION',
  // Unrecognised mime / binary / oversize — could not deliver to this lane.
  OMITTED_UNSUPPORTED = 'OMITTED_UNSUPPORTED',
  // Text was injected but had to be cut for token budget.
  TRUNCATED_TEXT = 'TRUNCATED_TEXT',
  // Audio: the transcript reached the model as words the user spoke — never
  // the audio bytes.
  TRANSCRIPT = 'TRANSCRIPT',
  // Extraction or transcription had not finished when the turn ran — the
  // model was told the file is still being read.
  STILL_PROCESSING = 'STILL_PROCESSING',
  // Extraction or transcription failed — nothing of the file's content
  // reached the model.
  FAILED_PROCESSING = 'FAILED_PROCESSING',
  // Video bytes sent natively to a model that accepts video input.
  NATIVE_VIDEO = 'NATIVE_VIDEO',
  // The model cannot see; ClawAI's vision helper described the image and the
  // model received that description as derived observations (ADR-120 batch 5).
  // The entry names the helper in helperProvider / helperModel.
  DERIVED_IMAGE_TEXT = 'DERIVED_IMAGE_TEXT',
  // The model cannot watch the video natively; it received the video's
  // timestamped transcript plus sampled frames (as images, or as the vision
  // helper's descriptions) — multimodal batch 8. `frameTimestampsMs` says
  // which moments were sampled.
  VIDEO_FRAMES_AND_TRANSCRIPT = 'VIDEO_FRAMES_AND_TRANSCRIPT',
}
