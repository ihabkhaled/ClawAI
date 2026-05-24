export const HF_DEFAULT_SEARCH_LIMIT = 20;
export const HF_REQUEST_TIMEOUT_MS = 15_000;
export const HF_TRENDING_FILTER = 'gguf';

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
