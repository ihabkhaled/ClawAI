import type { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';

/** The classifier's decision about one user message. */
export type ResearchGateVerdict = {
  /** True only when answering genuinely needs information from the internet. */
  needsWeb: boolean;
  /** Short justification, logged so a wrong verdict can be traced to its cause. */
  reason: string;
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
  /** One short first-person sentence shown to the user, e.g. "I'll read that site first." */
  narration: string;
  /** The planner's reasoning in its own words, shown as the AI thinking; '' when absent. */
  thinking: string;
  /** Which model decided, for the log and the stored narration. */
  decidedBy: string | null;
};

/** The planner's second look, after a crawl, at whether a web search is still needed. */
export type CrawlFollowUp = {
  needsSearch: boolean;
  query: string | null;
  narration: string;
  thinking: string;
};
