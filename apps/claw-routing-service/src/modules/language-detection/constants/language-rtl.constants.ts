// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

export const RTL_LANGUAGES = new Set<string>(['ar', 'he', 'fa', 'ur', 'ckb', 'sd', 'yi']);

export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGUAGES.has(lang.toLowerCase());
}
