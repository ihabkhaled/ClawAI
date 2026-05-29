/**
 * Parsed shape of a user-chosen judge/critic model selection.
 *
 * - `provider` is non-null ONLY when the leading `PROVIDER:` segment matched a
 *   known connector/provider token (case-insensitive); the model is then
 *   executed through the normal `callProvider` dispatch (token-accounted).
 * - `provider` is null for a plain model name (e.g. `gemma3:4b`) or `AUTO`,
 *   meaning the caller keeps the existing local-first behavior.
 */
export type ParsedJudgeModel = {
  provider: string | null;
  model: string;
};
