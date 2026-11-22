import { LANGUAGE_NAME_TO_CODE } from './language.constants';

/**
 * Base language code (`en`, `ar`) of a BCP-47 tag or a provider's language name;
 * null when it cannot be told. `pt-BR` → `pt`, `English` → `en`.
 */
export function baseLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  const primary = lower.split(/[-_]/u)[0] ?? '';
  return /^[a-z]{2,3}$/u.test(primary) && lower.length <= 15
    ? primary
    : (new Map(Object.entries(LANGUAGE_NAME_TO_CODE)).get(lower) ?? null);
}
