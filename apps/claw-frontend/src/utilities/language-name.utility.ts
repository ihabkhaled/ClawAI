/** The primary language subtag of a BCP 47 tag, lowercased: `pt-BR` → `pt`, `EN` → `en`. */
export function primaryLanguageSubtag(code: string): string {
  return (code.split(/[-_]/u)[0] ?? '').toLowerCase();
}

/**
 * A language's name in the reader's language (`es` read in German is "Spanisch"), via
 * `Intl.DisplayNames`. A code the runtime does not know, or a malformed one, is shown as received.
 */
export function languageDisplayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
