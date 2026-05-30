/**
 * Options influencing how {@link InferenceProxyManager} forwards the upstream
 * response. Carrying the flag in a value (rather than reading AppConfig deep
 * in the call tree) keeps test setup simple.
 */
export interface ProxyOptions {
  reasoningExtractionEnabled: boolean;
  isStream: boolean;
}

/**
 * Result of running one streaming chunk through the rewriter.
 *
 * rewritten — bytes that should be forwarded to the downstream HTTP response
 *   immediately (whole SSE events).
 * leftover — trailing partial event held back for the next call. Empty when
 *   the chunk ended on an event boundary or when the rewriter was called in
 *   flush mode.
 */
export interface ChunkRewriteResult {
  rewritten: string;
  leftover: string;
}

/**
 * Minimal structural type for the `delta` field of an OpenAI-compatible
 * streaming SSE frame. We intentionally do not enumerate every key; the
 * rewriter copies unknown keys verbatim and only touches `content` /
 * `reasoning_content`.
 */
export interface SseFrameDelta {
  content?: string;
  reasoning_content?: string;
  [extra: string]: unknown;
}
