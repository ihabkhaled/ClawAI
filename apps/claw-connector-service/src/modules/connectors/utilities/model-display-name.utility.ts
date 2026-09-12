import { MODEL_DISPLAY_NAME_ACRONYMS } from '../constants/model-display-name.constants';

/**
 * Turn a provider's raw model id into a name fit to print.
 *
 * Gemini's `/models` endpoint returns ids namespaced as `models/gemini-2.5-pro`,
 * and the original formatter title-cased the whole string verbatim — so the
 * model picker, and then the public catalog, both rendered
 * "Models/gemini 2.5 Pro". Three separate things were wrong with that: the
 * namespace prefix is an API detail rather than part of the name, splitting on
 * `-` alone left `models/gemini` glued together, and mechanical title-casing
 * mangles the acronyms these names are mostly made of (`Tts`, `Gpt`, `Ai`).
 *
 * **Idempotent by design.** It is applied when a sync writes a row AND when the
 * public catalog reads one, because rows written before this existed still hold
 * the mangled name and a marketing page must not wait for an administrator to
 * re-sync before it stops looking broken. Running it over an already-clean name
 * returns that name unchanged.
 */
export function formatModelDisplayName(rawModelId: string): string {
  // A trailing-slash id like "models/" must not collapse to an empty name: a
  // blank entry is worse than a wrong one, because nothing looks broken until
  // somebody notices a gap in the list. Fall back to the whole id.
  //
  // Written as filter+at(-1) rather than findLast, which this service's TS lib
  // target does not have — a lint auto-fix once rewrote it and only the
  // pre-commit typecheck caught it.
  const segments: string[] = rawModelId.split('/').filter((part: string) => part.length > 0);
  const withoutNamespace: string = segments.at(-1) ?? rawModelId;

  return withoutNamespace
    .split(/[-_\s]+/)
    .filter((part: string) => part.length > 0)
    .map((part: string) => formatPart(part))
    .join(' ');
}

function formatPart(part: string): string {
  const upper = part.toUpperCase();
  if (MODEL_DISPLAY_NAME_ACRONYMS.has(upper)) {
    return upper;
  }
  // A version-ish or size-ish token keeps its own shape: "2.5", "4o", "70b",
  // "a4b". Capitalising these produces "70B" and "4O", which read as typos.
  if (/\d/.test(part)) {
    return part;
  }
  return part.charAt(0).toUpperCase() + part.slice(1);
}
