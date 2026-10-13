import {
  PROVIDER_LABELS,
  PROVIDER_NON_ALNUM_PATTERN,
  UNKNOWN_LABEL,
} from '../constants/observability.constants';

/** `local-ollama`, `LOCAL_OLLAMA` and `Local Ollama` collapse to one key. */
export function normalizeProviderKey(raw: string | null | undefined): string {
  const key = (raw ?? '').replace(PROVIDER_NON_ALNUM_PATTERN, '_').toUpperCase();
  return key === '' ? UNKNOWN_LABEL : key;
}

/** The one place provider display names are decided in this service. */
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
