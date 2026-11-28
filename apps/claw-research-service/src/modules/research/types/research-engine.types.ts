import type { ResearchPlatform, ResearchSource } from '../../../generated/prisma';
import type { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import type {
  PlatformApiOutcome,
  PlatformTaggedResult,
} from '../../platforms/types/platform.types';
import type { ExecuteSearchDto } from '../../search/dto/execute-search.dto';
import type { SearchExecutionResult } from '../../search/types/search-execution-result.types';
import type { EvidenceItem } from './evidence-bundle.types';

/** One row of `RESEARCH_DEPTH_BUDGETS`. */
export type DepthBudget = {
  /** Total search queries: primary + expansion. */
  queries: number;
  /** Search hits opened (top N, max 2 per host). */
  fetchTopN: number;
};

/** `bundle.stats` (research engine B1+B2). Additive; only on runs that sent an engine field. */
export type ResearchRunStats = {
  round: number;
  queriesRun: number;
  /** Queries actually run (served from cache counts as run). */
  queries: string[];
  languages: string[];
  /** Provider names that answered at least one query. */
  providersUsed: string[];
  /** Unique search hits after merging every query and dropping excluded URLs. */
  resultsFound: number;
  /** Pages read: fetched now or served from thread memory for a fetch target; never a thin shell. */
  pagesRead: number;
  /** Pages dropped as the same URL or the same normalised text as an earlier page. */
  duplicatesRemoved: number;
  /** Items served from this thread's earlier research instead of being fetched. */
  reusedFromThread: number;
  /** Queries answered from the Redis search cache (no provider call, no unit). */
  cachedSearches: number;
  /**
   * Research engine B3, additive: slugs of the platforms run this round that
   * returned at least one result (an API with hits, a site search with an
   * on-domain hit). Present only on a platform run (depth >= 2 + `platforms`).
   */
  platforms?: string[];
};

/** One query's merged answer, in the order the query ranked it. */
export type QueryResultSet = {
  query: string;
  results: readonly PlatformTaggedResult[];
  /** How much one rank in this set counts; 1 when absent. */
  weight?: number;
};

/** A search hit after reciprocal-rank fusion across queries. */
export type FusedSearchResult = PlatformTaggedResult & {
  /** The first query (primary first) that found this page. */
  query: string;
};

/** The platforms a platform run (B3) uses, picked once from the enabled registry. */
export type PlatformRunPlan = {
  /** Every enabled platform, priority order: used to tag any item by host. */
  all: ResearchPlatform[];
  /** OFFICIAL_API platforms of the asked categories (≤ PLATFORM_MAX_API_PER_RUN). */
  api: ResearchPlatform[];
  /** SITE_SEARCH platforms of the asked categories (≤ PLATFORM_MAX_SITE_PER_RUN), before the budget split. */
  site: ResearchPlatform[];
  /** Wikipedia editions to search (≤ PLATFORM_MAX_WIKIPEDIA_LANGUAGES). */
  wikipediaLanguages: string[];
  /** The query language passed to language-aware providers; null when unknown. */
  queryLanguage: string | null;
};

/** How the extra-query budget (depth budget − primary) is split. */
export type QueryBudgetSplit = {
  expansions: number;
  site: number;
};

/** One site-scoped search of a SITE_SEARCH platform and how it ended. */
export type SiteSearchOutcome = {
  platform: ResearchPlatform;
  outcome: ExpansionOutcome;
};

/** What the search phase of one engine run sends (B2 + B3). */
export type SearchPhasePlan = {
  primaryQuery: string;
  expansions: string[];
  siteRows: ResearchPlatform[];
  plan: PlatformRunPlan | null;
  base: Omit<ExecuteSearchDto, 'query'>;
  useCache: boolean;
  round: number;
};

/** Every answer of the search phase; the primary is null when a follow-up round had no expansion provider. */
export type SearchPhaseAnswers = {
  primary: SearchExecutionResult | null;
  outcomes: ExpansionOutcome[];
  sites: SiteSearchOutcome[];
  apis: PlatformApiOutcome[];
};

/** What a platform run adds to `stats` (replaces `languages` with what was really searched). */
export type PlatformRunCounters = {
  platforms: string[];
  languages: string[];
};

/** This thread's recent research, loaded once per run. */
export type ThreadMemory = {
  /** Pages read successfully in the window, by canonical URL key (most recent wins). */
  readByKey: ReadonlyMap<string, ResearchSource>;
  /** One row per canonical URL (a read page preferred over a hit), most recent first. */
  rows: readonly ResearchSource[];
};

/** What the evidence store needs to write one run's sources. */
export type PersistSourcesInput = {
  runId: string;
  userId: string;
  threadId: string | null;
  round: number;
  workflow: ResearchWorkflowKind;
  items: readonly EvidenceItem[];
  /** Canonical keys of pages the user pasted (stored as DIRECT). */
  directKeys: ReadonlySet<string>;
  now: Date;
};

/** How one expansion query ended: answered, skipped (no expansion provider) or failed. */
export type ExpansionOutcome = {
  query: string;
  result: SearchExecutionResult | null;
  /** Why it failed; null when it answered or was skipped. */
  error: string | null;
};

/** What the multi-query search phase hands back to the run. */
export type EngineSearchCounters = {
  queries: string[];
  cachedSearches: number;
  providersUsed: string[];
  resultsFound: number;
};
