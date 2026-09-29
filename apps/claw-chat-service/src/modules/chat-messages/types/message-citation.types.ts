/**
 * One source exactly as the model was shown it: `index` is the number the
 * prompt printed as `[n]` (1-based), so an answer's `[3]` means `index === 3`
 * on the same message and nothing else.
 */
export type StoredCitation = {
  index: number;
  title: string | null;
  url: string;
  snippet: string;
};

/** What the assistant row records about the context it was answered with. */
export type StoredContextMetadata = {
  memoryCount: number;
  fileIds: string[];
  citations?: StoredCitation[];
};
