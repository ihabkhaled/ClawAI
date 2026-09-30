import { PROMPT_LIBRARY_MAX_TAG_LENGTH, PROMPT_LIBRARY_MAX_TAGS } from '@/constants/chat.constants';

const PLACEHOLDER_PATTERN = /\{\{([a-z][a-z0-9_]{0,31})\}\}/g;

/**
 * Replaces each `{{name}}` in `body` with `values[name]`.
 *
 * A placeholder with no entry in `values` is left as written, so a half-filled
 * template never silently loses a slot. Replacement text is inserted verbatim
 * (a function replacer, so `$&` and friends in user text are not interpreted).
 */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replaceAll(PLACEHOLDER_PATTERN, (match: string, name: string): string =>
    Object.prototype.hasOwnProperty.call(values, name) ? (values[name] ?? match) : match,
  );
}

/** Splits comma-separated tag text the way the server will normalise it. */
export function parsePromptTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim().toLowerCase().slice(0, PROMPT_LIBRARY_MAX_TAG_LENGTH);
    if (tag.length > 0) {
      seen.add(tag);
    }
  }
  return [...seen].slice(0, PROMPT_LIBRARY_MAX_TAGS);
}

/** Appends `text` to a draft on a new line, or returns it alone for an empty draft. */
export function appendToDraft(draft: string, text: string): string {
  return draft.trim().length === 0 ? text : `${draft}\n${text}`;
}
