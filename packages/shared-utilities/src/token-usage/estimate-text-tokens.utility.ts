/**
 * Estimates the number of tokens in a string using the CHAR_DIV_4 heuristic
 * (`ceil(length / 4)`), the same rough rule OpenAI documents for English text.
 *
 * Returns 0 for empty, whitespace-free-empty, undefined, or null input. Never
 * throws and never returns a negative number — it is the universal fallback so
 * every model call can produce a TokenUsage even when the provider omits one.
 *
 * @example
 * ```ts
 * estimateTextTokens('hello world'); // 3 (ceil(11 / 4))
 * estimateTextTokens('');            // 0
 * ```
 */
export function estimateTextTokens(text: string | null | undefined): number {
  if (text === null || text === undefined || text.length === 0) {
    return 0;
  }
  return Math.max(0, Math.ceil(text.length / 4));
}
