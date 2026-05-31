// Builds the "lastProvider · lastModel" preview line rendered under the
// thread title in the chat thread list. Returns `null` when the thread has
// never received an assistant message (no model recorded). Kept in a utility
// (not the component file) so the lint rule against standalone functions in
// TSX files stays clean, and so other surfaces that show thread cards (e.g.
// global search results) can reuse the same formatting.
export function buildThreadPreviewSnippet(
  provider: string | null,
  model: string | null,
): string | null {
  if (model === null) {
    return null;
  }
  if (provider === null) {
    return model;
  }
  return `${provider} · ${model}`;
}
