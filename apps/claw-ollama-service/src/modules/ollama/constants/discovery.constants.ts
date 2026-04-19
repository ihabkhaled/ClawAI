export const DISCOVERY_DEFAULT_MAX_RESULTS = 50;
export const DISCOVERY_DEFAULT_TIMEOUT_MS = 15_000;
export const DISCOVERY_DEFAULT_CONCURRENCY = 4;
export const DISCOVERY_STALE_AFTER_DAYS = 30;
export const DISCOVERY_MIN_CONFIDENCE = 0.3;
export const DISCOVERY_AUTO_APPROVE_CONFIDENCE = 0.85;
export const DISCOVERY_RANK_SCORE_WEIGHT_RECENCY = 0.3;
export const DISCOVERY_RANK_SCORE_WEIGHT_FAMILY = 0.4;
export const DISCOVERY_RANK_SCORE_WEIGHT_SIZE = 0.2;
export const DISCOVERY_RANK_SCORE_WEIGHT_CAPABILITY = 0.1;
export const DISCOVERY_SEED_FAMILIES = [
  'qwen3',
  'qwen2.5-coder',
  'llama3.3',
  'llama3.2',
  'gemma3',
  'phi4',
  'phi4-mini',
  'deepseek-r1',
  'deepseek-coder-v2',
  'mistral',
  'mixtral',
  'devstral',
  'codestral',
  'granite3',
  'smollm2',
  'command-r-plus',
  'qwq',
  'starcoder2',
  'llava',
  'moondream',
  'nomic-embed-text',
  'mxbai-embed-large',
  'meditron',
  'nous-hermes',
  'solar',
  'yi-coder',
];

export const DISCOVERY_DEFAULT_SOURCES = [
  {
    name: 'Ollama Public Library',
    type: 'OLLAMA_LIBRARY' as const,
    baseUrl: 'https://ollama.com/library',
  },
  {
    name: 'Ollama Registry',
    type: 'OLLAMA_REGISTRY' as const,
    baseUrl: 'https://registry.ollama.ai',
  },
];

export const LIBRARY_ITEM_REGEX =
  /<a[^>]+href="\/library\/([^":/]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<p[^>]*>([^<]*)<\/p>/g;

export const LIBRARY_SIMPLE_HREF_REGEX = /href="\/library\/([^":/]+)"/g;

export const LIBRARY_TAG_REGEX = /\/library\/[^/]+:([a-z0-9][a-z0-9._-]*)/gi;

export const VALID_PARAM_TAG_REGEX = /^(\d+(?:\.\d+)?[bm])$/i;

export const LIBRARY_TOP_LISTINGS = 10;
export const LIBRARY_MAX_TAGS_PER_MODEL = 5;
export const ENRICHMENT_CONCURRENCY = 4;

export const PACK_RECOMMENDED_LIMIT = 8;

export const CONFIDENCE_FAMILY_MATCH = 0.7;
export const CONFIDENCE_KEYWORD_BOOST = 0.1;
export const CONFIDENCE_CAPABILITY_BOOST = 0.05;
export const CONFIDENCE_DEFAULT = 0.2;
export const CONFIDENCE_MAX = 1.0;

export const BYTES_PER_PARAM_4BIT = 0.75;

export const PARAM_SIZE_REGEX = /^(\d+(?:\.\d+)?)\s*([bm])$/i;

export const RANK_SCORE_FAMILY_BONUS = 40;
export const RANK_SCORE_CAPABILITY_WEIGHT = 5;
export const RANK_SCORE_SIZE_PENALTY = 15;
export const RANK_SCORE_SIZE_SWEETSPOT_BONUS = 10;
export const RANK_PENALTY_SIZE_THRESHOLD_BYTES = 100_000_000_000n;
export const RANK_SIZE_SWEETSPOT_MIN_BYTES = 3_000_000_000n;
export const RANK_SIZE_SWEETSPOT_MAX_BYTES = 20_000_000_000n;
