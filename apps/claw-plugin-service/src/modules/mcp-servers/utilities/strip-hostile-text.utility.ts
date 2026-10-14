import { containsHostileText } from '../../catalog/utilities/contains-hostile-text.utility';

/**
 * Removes control, zero-width, bidi and other invisible code points and normalises to NFC.
 * Server-supplied text (descriptions, names, results) is untrusted: it is cleaned, never
 * trusted, and invisible characters are the usual way to hide an instruction in it.
 */
export function stripHostileText(text: string, allowLineBreaks: boolean): string {
  const kept: string[] = [];
  for (const char of text.normalize('NFC')) {
    if (!containsHostileText(char, allowLineBreaks)) kept.push(char);
  }
  return kept.join('');
}
