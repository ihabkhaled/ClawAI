export const LLAMA_HEALTH_POLL_INTERVAL_MS = 1000;
export const LLAMA_HEALTH_BACKOFF_AFTER_MS = 30_000;
export const LLAMA_UNLOAD_TIMEOUT_MS = 30_000;

export const ALLOWED_CUSTOM_ARGS: readonly string[] = Object.freeze([
  '--n-batch',
  '--n-ubatch',
  '--mlock',
  '--no-mmap',
  '--numa',
  '--rope-freq-base',
  '--rope-freq-scale',
  '--cache-type-k',
  '--cache-type-v',
  '--keep',
  '--main-gpu',
  '--tensor-split',
]);

export const FORBIDDEN_ARG_TOKENS: readonly string[] = Object.freeze([';', '&&', '|', '`', '$(']);
