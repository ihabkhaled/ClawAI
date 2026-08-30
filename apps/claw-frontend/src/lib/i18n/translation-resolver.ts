import type { TranslationDictionary } from '@/types/i18n.types';

export function resolveTranslation(
  dictionary: TranslationDictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  // A missing label must not take the page down. `t()` is called with the result
  // of lookup tables all over this app (`LABELS[item.type]`), and a value the
  // table does not cover yields `undefined` — which used to reach `.split` and
  // throw, white-screening the whole route over one unrenderable word.
  //
  // The context-pack list did exactly that: the API returns the V2 item types
  // (TEXT, FILE, URL, ...) and the label map only knew the V1 ones, so a single
  // TEXT row crashed the page. Degrading to an empty string keeps the rest of
  // the page alive; the missing key is a rendering bug, not a fatal one.
  if (typeof key !== 'string' || key === '') {
    return '';
  }

  const parts = key.split('.');
  if (parts.length < 2) {
    return key;
  }

  let current: unknown = dictionary;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') {
    return key;
  }
  if (params === undefined) {
    return current;
  }

  return Object.entries(params).reduce<string>(
    (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
    current,
  );
}
