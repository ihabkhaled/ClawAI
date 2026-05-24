// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)
// Reads RouterModelRegistry.languageStrengthJson and applies a score boost
// to candidates with high strength in the detected language.

import type { LanguageStrength } from '../types/language-detection.types';

export function resolveLanguageStrength(
  _registry: { languageStrengthJson?: LanguageStrength | null },
  _detectedLanguage: string,
): number {
  throw new Error(
    'SCAFFOLD-R7 — resolveLanguageStrength not implemented; see docs/15-ai-context/routing-flagship-streams/08-r7-i18n-non-english.md',
  );
}
