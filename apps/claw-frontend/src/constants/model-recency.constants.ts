/**
 * The release-date suffixes providers append to a pinned model snapshot.
 *
 * Two shapes, both meaning the same thing: OpenAI writes
 * `gpt-5.1-2025-11-13`, Anthropic writes `claude-opus-4-5-20251101`. Anchored
 * to the end so a date inside a name could never be mistaken for a suffix.
 *
 * Declared with no `g` flag on purpose: a global regex carries `lastIndex`
 * between calls, and a shared module-level one would then skip matches on
 * every other invocation.
 */
export const MODEL_DATE_SUFFIX_PATTERNS: readonly RegExp[] = [
  // gpt-5.1-2025-11-13
  /-\d{4}-\d{2}-\d{2}$/u,
  // claude-opus-4-5-20251101
  /-\d{8}$/u,
  // Gemini's month-year: models/antigravity-preview-05-2026.
  //
  // This one is load-bearing, not tidiness. Such a key carries no version of
  // its own, so without stripping it the parser reads "05-2026" AS the version
  // — 5.2026 — and an unversioned preview outranks every real model in the
  // list. It put "Models/deep Research Pro Preview 12 2025" at the top of the
  // Gemini group in the live picker.
  /-\d{1,2}-\d{4}$/u,
];

/**
 * The characters that can begin and continue a version token.
 *
 * Deliberately NOT a regular expression. `/^\d+(?:\.\d+)?/` is safe — it is
 * anchored and has no nested quantifier — but the security linter cannot prove
 * that and flags it, and suppressing a finding is prohibited. Character
 * checking is also simply clearer about what "leading digits, then at most one
 * dot group" means.
 */
export const MODEL_VERSION_DIGITS = '0123456789';

/**
 * The primary product line for each provider.
 *
 * Version numbers are only comparable WITHIN a product line. Gemma 4 is not
 * "newer" than Gemini 3.7 — they are different lines that happen to number
 * independently — but a plain numeric sort says 4 > 3.7 and put Gemma and
 * Imagen above every Gemini model in the live picker.
 *
 * So the provider's own line sorts first, and everything else follows. This is
 * a naming convention, not a product fact: OpenAI's line has been "gpt" for a
 * decade and Anthropic's "claude" since launch. It does not drift the way a
 * model roster does, which is what rules/03 forbids hardcoding.
 *
 * A provider with no entry simply has no preferred line, and its models sort by
 * version alone — which is the right answer when a provider ships one line.
 */
export const PROVIDER_PRIMARY_MODEL_FAMILY: Readonly<Record<string, string>> = {
  OPENAI: 'gpt',
  ANTHROPIC: 'claude',
  GEMINI: 'gemini',
  DEEPSEEK: 'deepseek',
  GROK: 'grok',
};
