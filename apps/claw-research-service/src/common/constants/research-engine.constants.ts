import { EVIDENCE_FETCH_TOP_N, EVIDENCE_MAX_ITEMS } from './evidence.constants';
import type { DepthBudget } from '../../modules/research/types/research-engine.types';

/**
 * Research depth budgets (research engine B2), indexed by depth 0-5.
 * `queries` = primary + expansion queries; `fetchTopN` = search hits opened.
 * Depth absent keeps today's behaviour (one query, `EVIDENCE_FETCH_TOP_N`).
 * chat-service clamps depth to 3 for now; L4-L5 come with per-plan config (B8).
 * Depth 1 reads as many pages as today (8): chat-service sends depth 1 for every
 * plan without a council, and that must never read fewer pages than no depth.
 */
export const RESEARCH_DEPTH_BUDGETS: readonly DepthBudget[] = [
  { queries: 1, fetchTopN: EVIDENCE_FETCH_TOP_N },
  { queries: 2, fetchTopN: EVIDENCE_FETCH_TOP_N },
  { queries: 4, fetchTopN: 8 },
  { queries: 6, fetchTopN: 12 },
  { queries: 10, fetchTopN: 16 },
  { queries: 14, fetchTopN: 20 },
];

/** Wire bounds of the engine fields on the research DTO (contract B1+B2). */
export const RESEARCH_THREAD_ID_MAX_LENGTH = 64;
export const RESEARCH_MAX_EXPANSION_QUERIES = 12;
export const RESEARCH_EXPANSION_QUERY_MAX_LENGTH = 300;
export const RESEARCH_MAX_LANGUAGES = 6;
export const RESEARCH_LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}$/u;
export const RESEARCH_MAX_DEPTH = 5;
export const RESEARCH_MAX_ROUND = 5;
export const RESEARCH_MAX_EXCLUDE_URLS = 60;
export const RESEARCH_EXCLUDE_URL_MAX_LENGTH = 2048;

/*
 * Platform registry (research engine B3). Platforms run only when the request
 * sends `platforms` (categories) AND depth >= PLATFORM_MIN_DEPTH.
 */
/** Most platform categories one request may ask for. */
export const RESEARCH_MAX_PLATFORM_CATEGORIES = 6;
/** Platforms run only from this depth up; below it a run is exactly B2. */
export const PLATFORM_MIN_DEPTH = 2;
/** Most OFFICIAL_API platforms one run calls (Wikipedia counts once). */
export const PLATFORM_MAX_API_PER_RUN = 6;
/** Most SITE_SEARCH platforms one run searches (each one query from the depth budget). */
export const PLATFORM_MAX_SITE_PER_RUN = 4;
/** Most Wikipedia language editions one run searches. */
export const PLATFORM_MAX_WIKIPEDIA_LANGUAGES = 3;
/** The Wikipedia edition searched when the request names no language. */
export const PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE = 'en';
/** Provider kinds whose adapter already honours `filters.language` (wire unchanged). */
export const LANGUAGE_AWARE_PROVIDER_KINDS: ReadonlySet<string> = new Set<string>(['SEARXNG']);

/**
 * From this round on, the PRIMARY query also runs on expansion providers only
 * (cost rule): a paid provider answers once per chat turn, not once per round.
 */
export const RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND = 2;

/** Reciprocal-rank-fusion constant: each query adds weight / (K + rank). */
export const RESEARCH_RRF_K = 60;
/**
 * The primary query is the question itself and is the only one the strongest provider sees, so its hits weigh double;
 * platform (official API) hits weigh less, or five encyclopedia rows outrank the page that holds the answer
 * (measured 2026-11-28 on a song-lyrics lookup).
 */
export const RESEARCH_RRF_PRIMARY_WEIGHT = 2;
export const RESEARCH_RRF_PLATFORM_WEIGHT = 0.6;

/** Fused search hits kept in an engine bundle (fetched pages are kept on top of these). */
export const RESEARCH_ENGINE_MAX_HITS_KEPT = EVIDENCE_MAX_ITEMS;

/** Thread memory looks back this far (same user + thread). */
export const THREAD_MEMORY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Most stored sources loaded for one run's thread memory. */
export const THREAD_MEMORY_MAX_SOURCES = 50;
/** Most earlier sources added to a run because they match the intent. */
export const THREAD_MEMORY_MAX_EXTRAS = 3;
/** Distinct significant tokens an earlier source must share with the intent. */
export const THREAD_MEMORY_MIN_SHARED_TOKENS = 2;
/** Confidence given to an earlier source added for its overlap (not fetched now). */
export const THREAD_MEMORY_EXTRA_CONFIDENCE = 0.5;
/** How much of a stored excerpt counts toward overlap (with its title and query). */
export const THREAD_MEMORY_OVERLAP_EXCERPT_CHARS = 600;
/** A stored row whose page was actually read carries this fetch status. */
export const RESEARCH_SOURCE_READ_STATUS = 'OK';
/** A page that stayed a script shell on every tier: stored, never reused as read. */
export const RESEARCH_SOURCE_THIN_STATUS = 'THIN';

/** Letters, digits and combining marks (Arabic, Devanagari, Thai) form one token. */
export const SIGNIFICANT_TOKEN_PATTERN = /[\p{L}\p{N}\p{M}]+/gu;
/** Shorter tokens (in code points) are not significant. */
export const SIGNIFICANT_TOKEN_MIN_LENGTH = 3;
/** Function and filler words that never make two texts "about the same thing". */
export const SIGNIFICANT_TOKEN_STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'with',
  'what',
  'who',
  'how',
  'why',
  'when',
  'where',
  'which',
  'that',
  'this',
  'these',
  'those',
  'from',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'not',
  'but',
  'you',
  'your',
  'about',
  'into',
  'than',
  'then',
  'them',
  'they',
  'their',
  'there',
  'can',
  'will',
  'would',
  'should',
  'could',
  'does',
  'did',
  'its',
  'our',
  'out',
  'all',
  'any',
  'more',
  'most',
  'some',
  'such',
  'only',
  'also',
  'just',
  'over',
  'after',
  'before',
  'tell',
  'give',
  'show',
  'please',
  'latest',
  'news',
  'today',
  'new',
]);

/** Stored excerpt cap per source. */
export const RESEARCH_SOURCE_EXCERPT_MAX_CHARS = 12_000;
/** research_sources rows older than this are deleted. */
export const RESEARCH_SOURCE_RETENTION_DAYS = 30;
export const RESEARCH_SOURCE_RETENTION_MS = RESEARCH_SOURCE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
/** How often the retention sweeper runs. */
export const RESEARCH_SOURCE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
