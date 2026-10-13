/** A provider stream read to its end and folded into one answer. */
export type FoldedProviderStream = {
  /** The answer text exactly as streamed (inline thinking tags not yet split out). */
  content: string;
  /** The separate thinking channel (`message.thinking`, `reasoning_content`). */
  thinking: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedPromptTokens?: number;
  cacheCreationPromptTokens?: number;
  reasoningTokens?: number;
  toolCallCount: number;
  /** True once the reader has produced at least one fragment. */
  sawFragment: boolean;
  /**
   * The raw body, kept only while no fragment has been produced, so a provider
   * that answered `stream: true` with one plain JSON document can be read as a
   * buffered reply.
   */
  rawBody: string;
};

/** How a failed internal generate call is reported and what happens to its hold. */
export type InternalGenerateFailure = {
  /** The error to throw (or to turn into an error frame). */
  error: unknown;
  /** Why the money goes back. */
  releaseReason: 'PROVIDER_ERROR' | 'CANCELLED' | 'TIMEOUT';
};
