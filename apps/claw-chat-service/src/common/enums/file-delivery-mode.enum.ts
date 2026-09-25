// Captures HOW (or whether) an attached file actually reached a particular
// provider+model during a chat/compare run. Used in the assistant message
// metadata.fileDelivery payload and surfaced on ParallelModelResponse so the
// UI + judge/critic can reason about file-grounding fairness — a model that
// legitimately did not receive a file (OMITTED_NO_VISION) is NOT penalized.
export enum FileDeliveryMode {
  // Text decoded from a text/*, csv, json, markdown or code-like file and
  // injected into the system block. The provider sees the file content.
  EXTRACTED_TEXT = 'EXTRACTED_TEXT',
  // Image attached as a native image part (OpenAI image_url, Anthropic image
  // block, Gemini inline_data, Ollama images[]). Provider has vision.
  NATIVE_IMAGE = 'NATIVE_IMAGE',
  // Image attached, but the target provider+model has no vision support. The
  // bytes are NOT sent; the model is told honestly it cannot see the image and
  // gets its OCR text when there is any (ADR-120). Batch 5's helper-vision
  // step upgrades this mode when a helper describes the image.
  OMITTED_NO_VISION = 'OMITTED_NO_VISION',
  // The mime type is unrecognised / binary / oversize and we have no path to
  // deliver it. Persisted so the FE + judge know the file was dropped.
  OMITTED_UNSUPPORTED = 'OMITTED_UNSUPPORTED',
  // Text WAS injected but the token budget forced us to cut it short. The
  // provider saw a prefix of the file content; the judge should know this.
  TRUNCATED_TEXT = 'TRUNCATED_TEXT',
  // Audio: the transcript reached the model, framed as words the user SPOKE
  // (VOICE_NOTE_TRANSCRIPT_FRAME) — never the audio bytes.
  TRANSCRIPT = 'TRANSCRIPT',
  // Extraction or transcription had not finished when the turn ran. The model
  // was told the file is still being read, never that it is empty (rule 42.5).
  STILL_PROCESSING = 'STILL_PROCESSING',
  // Extraction or transcription failed. The model was told the reason
  // (rule 42.6); nothing of the file's content reached it.
  FAILED_PROCESSING = 'FAILED_PROCESSING',
  // Video bytes sent natively to a lane whose model accepts video input.
  NATIVE_VIDEO = 'NATIVE_VIDEO',
  // Image the lane's model cannot see, described instead by ClawAI's vision
  // helper (VISION_HELPER role, ADR-120 batch 5). The model received DERIVED
  // OBSERVATIONS framed as another model's description — never the bytes.
  // The entry names the helper in `helperProvider` / `helperModel`.
  DERIVED_IMAGE_TEXT = 'DERIVED_IMAGE_TEXT',
}
