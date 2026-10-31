import type { TranslateFunction } from '@/types/i18n.types';

const WARNING_KEY_PREFIX = 'research.';

/**
 * A context warning as the reader sees it, in their language.
 *
 * chat-service sends warnings as keys such as `research.searchTimedOut` or
 * `research.searchFailed:EXCEPTION` (the part after the colon is a diagnostic
 * kind, never shown). A key we have no text for - a newer server, or a plain
 * sentence - is shown as received.
 */
export function describeContextWarning(warning: string, t: TranslateFunction): string {
  if (!warning.startsWith(WARNING_KEY_PREFIX)) {
    return warning;
  }
  const colon = warning.indexOf(':');
  const key = colon === -1 ? warning : warning.slice(0, colon);
  const text = t(key);
  return text === key ? warning : text;
}

/** Every warning translated and joined for one line of display. */
export function describeContextWarnings(warnings: readonly string[], t: TranslateFunction): string {
  return warnings.map((warning) => describeContextWarning(warning, t)).join('; ');
}

/** The provider names of a search narration, from the comma string chat-service sends or a list. */
export function formatNarratedProviders(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((name) => String(name).trim())
      .filter((name) => name.length > 0)
      .join(', ');
  }
  return typeof value === 'string' ? value.trim() : '';
}
