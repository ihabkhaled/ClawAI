import { ModelCategory } from '../../../generated/prisma';

export const SEARCH_BROWSER_SCORE_MIN = 0;
export const SEARCH_BROWSER_SCORE_MAX = 1;
export const SEARCH_BROWSER_ELIGIBILITY_THRESHOLD = 0.5;
export const SEARCH_BROWSER_MIN_PARAMS_BILLIONS = 0.5;

export const SEARCH_BROWSER_FRIENDLY_CATEGORIES = new Set<ModelCategory>([
  ModelCategory.GENERAL,
  ModelCategory.REASONING,
  ModelCategory.THINKING,
  ModelCategory.CODING,
  ModelCategory.AGENT,
  ModelCategory.SUMMARIZATION,
  ModelCategory.JUDGE,
]);

export const SEARCH_BROWSER_HOSTILE_CATEGORIES = new Set<ModelCategory>([
  ModelCategory.IMAGE_GENERATION,
  ModelCategory.VISION,
  ModelCategory.EMBEDDING,
  ModelCategory.TRANSLATION,
]);

export const SEARCH_BROWSER_TOOL_CAPABILITY_TOKENS = [
  'tool_calling',
  'tools',
  'function_calling',
  'tool-use',
  'tool_use',
];

export const SEARCH_BROWSER_TEXT_SIGNALS = [
  'search',
  'browse',
  'browser',
  'agent',
  'tool',
  'research',
  'reason',
  'rag',
  'retrieval',
  'instruct',
];

export const SEARCH_BROWSER_WEIGHTS = {
  categoryFriendly: 0.3,
  toolCapability: 0.25,
  paramsAdequate: 0.15,
  paramsStrong: 0.1,
  textSignal: 0.1,
  multiTextSignal: 0.05,
  downloadableBonus: 0.05,
} as const;
