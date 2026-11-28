export const HF_DEFAULT_SEARCH_LIMIT = 20;
export const HF_REQUEST_TIMEOUT_MS = 15_000;
export const HF_TRENDING_FILTER = 'gguf';

// A HuggingFace import whose repo reports no GGUF context length is stored with this value,
// because `contextLength` is not nullable. It is a placeholder, never a model's window: the
// routing snapshot does not forward it (ADR-234).
export const HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH = 32_768;

// The license `createImported` writes on every HuggingFace import, whatever the repo says.
export const HF_IMPORT_LICENSE = 'Unknown';

// Quantizations we prefer when picking a recommended download file for a repo.
// Q4_K_M strikes the canonical quality/size balance most workstations want.
export const HF_QUANT_PRIORITY: readonly string[] = [
  'Q4_K_M',
  'Q5_K_M',
  'Q4_K_S',
  'Q5_K_S',
  'Q6_K',
  'Q8_0',
];

// Auto-sync caps to keep the catalog reasonable. We pull the top N by each
// sort key (trending / downloads / likes) and dedupe before insert.
export const HF_AUTO_SYNC_MAX_FILE_BYTES = 80n * 1_073_741_824n; // 80 GB ceiling
export const HF_AUTO_SYNC_INITIAL_DELAY_MS = 30_000;

// Tag-based heuristics for picking a category when a model is auto-imported.
// Order matters — the first match wins.
export const HF_TAG_CATEGORY_HINTS: ReadonlyArray<{ tag: string; category: string }> = [
  { tag: 'code', category: 'CODING' },
  { tag: 'coder', category: 'CODING' },
  { tag: 'coding', category: 'CODING' },
  { tag: 'reasoning', category: 'REASONING' },
  { tag: 'math', category: 'REASONING' },
  { tag: 'thinking', category: 'THINKING' },
  { tag: 'agent', category: 'THINKING' },
  { tag: 'instruct', category: 'GENERAL' },
  { tag: 'chat', category: 'GENERAL' },
  { tag: 'text-generation', category: 'GENERAL' },
];
