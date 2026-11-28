import type { ResearchPlatformCategory } from '../../../common/enums/research-platform-category.enum';
import type { HarnessCouncilVerdict } from './harness-council.types';
import type { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import type { ResearchRenderHint } from '../../../common/enums/research-render-hint.enum';

/** The classifier's decision about one user message. */
export type ResearchGateVerdict = {
  /** True only when answering genuinely needs information from the internet. */
  needsWeb: boolean;
  /** Short justification, logged so a wrong verdict can be traced to its cause. */
  reason: string;
  /** Present when the harness council decided (depth, languages, sub-questions, who voted). */
  council?: HarnessCouncilVerdict;
};

/** The only field the gate reads back from the runtime's generate endpoint. */
export type ResearchGateModelReply = {
  response?: string;
};

export interface ResearchGateCacheEntry {
  verdict: ResearchGateVerdict;
  expiresAt: number;
}

/** One configured classifier candidate, as routing-service serves it. */
export interface ResearchGateCandidate {
  provider: string;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}

/** The planner's decision for one user message. */
export type ResearchPlan = {
  action: PlannedResearchAction;
  /** Absolute URLs to crawl; always includes every URL the user wrote. */
  urls: string[];
  /** A search query the planner wrote, or null to search the prompt as-is. */
  query: string | null;
  /** Pages to read per crawled site, already bounded. */
  maxPages: number;
  /** The planner's tier-ordering hint for the crawled pages; undefined when it set none. */
  render?: ResearchRenderHint;
  /** One short first-person sentence shown to the user, e.g. "I'll read that site first." */
  narration: string;
  /** The planner's reasoning in its own words, shown as the AI thinking; '' when absent. */
  thinking: string;
  /** Which model decided, for the log and the stored narration. */
  decidedBy: string | null;
  /** The council's sub-questions (research engine B1); the search step sends them as extra queries. [] without one. */
  subQuestions: string[];
  /** Languages the council expects the answer to be published in, ranked; [] without a council. */
  languages: string[];
  /**
   * Research depth, already clamped to `RESEARCH_MAX_DEPTH`: sizes a search run and caps its rounds. The council's
   * depth when it decided; otherwise 1 for a plan with a search step and 0 for "answer" or a crawl.
   */
  depth: number;
  /** Source kinds the council wants searched; [] without a council. */
  platforms: ResearchPlatformCategory[];
};

/** The gate's look after a search round (research engine B2): is anything still missing, and what to search next. */
export type ResearchGapCheck = {
  done: boolean;
  /** New queries for the next round, ≤ `RESEARCH_GAP_CHECK_MAX_QUERIES`; [] when done. */
  queries: string[];
  narration: string;
  thinking: string;
};

/** The planner's second look, after a crawl, at whether a web search is still needed. */
export type CrawlFollowUp = {
  needsSearch: boolean;
  query: string | null;
  narration: string;
  thinking: string;
};

/** Ollama's native /api/chat reply, the fields the planner reads. */
export type OllamaCloudChatReply = {
  message?: { content?: string };
};

/** What the caller knows about the turn that the planner's reply must be checked against (ADR-152). */
export type ResearchPlanOptions = {
  /** Files travel with the turn: the planner's "answer" reasoning is dropped, never shown as a claim. */
  hasAttachments?: boolean;
  /** Links read out of an attachment; never added to the crawl by the planner. */
  excludedUrls?: readonly string[];
};
