// Per-model capability metadata threaded through the file-delivery pipeline.
// When supplied, callers in file-delivery.utility prefer the authoritative
// supportsVision flag over the heuristic provider allow-list. The shape is
// intentionally narrow — only the fields the delivery classifier consumes.
export type ModelMetadata = {
  provider: string;
  model: string;
  supportsVision: boolean;
};
