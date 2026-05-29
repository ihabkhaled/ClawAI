/**
 * Input shape for {@link normalizeTokenUsage}. Every count is optional because
 * a provider may omit usage entirely; the optional `*Text` fields are used to
 * estimate the missing side(s) via the CHAR_DIV_4 heuristic.
 */
export type NormalizeTokenUsageInput = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptText?: string;
  completionText?: string;
};

/**
 * Optional text fallbacks accepted by every per-provider extractor. When the
 * native response omits a count, the corresponding text is used to estimate it.
 */
export type ExtractUsageOptions = {
  promptText?: string;
  completionText?: string;
};

/**
 * Internal result of resolving a single prompt/completion side during
 * normalization: the safe token count and whether it was estimated from text.
 */
export type ResolvedTokenSide = {
  tokens: number;
  estimated: boolean;
};
