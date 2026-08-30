/**
 * A model's real context window, for a sibling service that has to decide how
 * much to put in a prompt.
 *
 * Deliberately narrow. It carries no pricing, no quality tier and no
 * capability flags: chat-service needs exactly two numbers to budget a prompt,
 * and a wider payload would invite it to make routing decisions that are
 * routing-service's to make.
 */
export type ModelContextWindowSnapshot = {
  provider: string;
  modelKey: string;
  /** null when the catalog row has not been enriched with a window yet. */
  contextWindowTokens: number | null;
  /** null when unknown; a hint only — the caller still reserves its own output. */
  maxOutputTokens: number | null;
  /** False when no catalog row exists at all, so the caller can log the gap. */
  known: boolean;
};
