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
  // Image attached, but the target provider+model has no vision support — we
  // could not deliver it. The model still produces a text response.
  OMITTED_NO_VISION = 'OMITTED_NO_VISION',
  // The mime type is unrecognised / binary / oversize and we have no path to
  // deliver it. Persisted so the FE + judge know the file was dropped.
  OMITTED_UNSUPPORTED = 'OMITTED_UNSUPPORTED',
  // Text WAS injected but the token budget forced us to cut it short. The
  // provider saw a prefix of the file content; the judge should know this.
  TRUNCATED_TEXT = 'TRUNCATED_TEXT',
}
