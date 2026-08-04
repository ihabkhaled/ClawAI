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

// `--jinja` makes llama-server render the GGUF's embedded Jinja chat template
// and, critically, PARSE the tool calls the model emits back into
// `message.tool_calls`. Without it, a tool-capable model still emits its call
// as raw text in `content` and nothing downstream can see it.
//
// It is gated per catalog entry, never globally: a GGUF whose embedded template
// is not tool-aware can fail to start under `--jinja`. Only entries that
// advertise the capability below get the flag, so a bad template can never take
// down a model that never needed tools.
export const LLAMA_JINJA_ARG = '--jinja';

// The capability token used in CatalogEntry.capabilities to mark an entry whose
// chat template can express tool calls.
export const CATALOG_TOOLS_CAPABILITY = 'tools';
