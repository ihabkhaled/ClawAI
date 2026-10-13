import {
  PROVIDER_LABELS,
  PROVIDER_NON_ALNUM_PATTERN,
  PROVIDER_UNKNOWN_KEY,
} from '../constants/provider-label.constants';

/**
 * `local-ollama`, `LOCAL_OLLAMA` and `Local Ollama` collapse to one key. The SQL
 * side (`k.provider_key`) applies the same rule, so grouping and filtering agree.
 */
export function normalizeProviderKey(raw: string | null | undefined): string {
  const key = (raw ?? '').replace(PROVIDER_NON_ALNUM_PATTERN, '_').toUpperCase();
  return key === '' ? PROVIDER_UNKNOWN_KEY : key;
}

/** The one place provider display names are decided. */
export function providerLabel(raw: string | null | undefined): string {
  const key = normalizeProviderKey(raw);
  const known = Object.entries(PROVIDER_LABELS).find(([name]) => name === key)?.[1];
  return (
    known ??
    key
      .split('_')
      .filter((word) => word !== '')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  );
}
