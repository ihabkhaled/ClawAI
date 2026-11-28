/**
 * The items of a comma list as chat-service sends them ("en, es" or ["en", "es"]): trimmed, blanks
 * dropped, each item once, in the order received.
 */
export function parseCommaList(value: unknown): string[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    raw = value.split(',');
  }
  const items = raw.map((item) => String(item).trim()).filter((item) => item.length > 0);
  return [...new Set(items)];
}

/**
 * Items joined the way the reader's language joins a list ("English and Spanish", "inglés y español",
 * "英语、西班牙语"). A locale the runtime cannot format falls back to a plain comma list.
 */
export function formatLocalList(items: readonly string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}
