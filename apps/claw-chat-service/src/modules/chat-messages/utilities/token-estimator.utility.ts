// Rough token estimate used for live progress before the provider reports
// exact usage. ~4 characters per token is the standard heuristic for English
// text; it is intentionally cheap and approximate (progress is labelled
// "estimated" until exact provider usage arrives).
export function estimateTokensFromText(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}
