/** The size list changes only when a sync or an admin edits a row, so ten minutes is plenty. */
export const MODEL_SIZES_STALE_MS = 10 * 60 * 1000;

/**
 * The picker names its local groups `local-ollama` and `local-llamacpp`; the registry
 * files the same models under the runtime's provider name. The Smart Router's deployments
 * call an Ollama cloud endpoint `OLLAMA_CLOUD`; the connector's catalog calls it `OLLAMA`.
 */
export const MODEL_SIZE_PROVIDER_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'local-ollama': 'OLLAMA',
  'local-llamacpp': 'LLAMACPP',
  OLLAMA_CLOUD: 'OLLAMA',
});

/** Token counts: thousands, millions. Context windows are quoted this way everywhere. */
export const TOKEN_UNIT_THOUSAND = 1_000;
export const TOKEN_UNIT_MILLION = 1_000_000;
export const TOKEN_UNIT_KIBI = 1_024;
export const TOKEN_UNIT_MEBI = 1_048_576;
/** 999,950 rounds to "1,000.0K" at one decimal, so it is already a million. */
export const TOKEN_MILLIONS_ROUNDING_FLOOR = 999_950;

/** Parameter counts arrive in billions; a trillion is a thousand of them. */
export const PARAMETER_BILLIONS_PER_TRILLION = 1_000;

/** The unit suffixes. Latin letters in every locale: model cards quote 128K and 70B the same way worldwide. */
export const MODEL_SCALE_SUFFIX = Object.freeze({
  thousand: 'K',
  million: 'M',
  billion: 'B',
  trillion: 'T',
});

/** Between the context part and the parameter part of a label. */
export const MODEL_SCALE_SEPARATOR = ' · ';

/** What a local runtime writes: "7.6B", "671B (37B active)", "1T". Split at the "(" so neither half nests a quantifier. */
export const RUNTIME_TOTAL_PATTERN = /^\s*(\d+\.?\d*)\s*([kmbt])\s*$/i;
export const RUNTIME_ACTIVE_PATTERN = /^\s*(\d+\.?\d*)\s*([kmbt])\s*active\s*\)\s*$/i;
