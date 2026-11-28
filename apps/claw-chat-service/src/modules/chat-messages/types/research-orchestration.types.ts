import type { ResearchPlatformCategory } from '../../../common/enums/research-platform-category.enum';

/** The parts of a stored message a research plan may read. */
export type ResearchConversationMessage = {
  role: string;
  content: string;
};

/** Everything the AUTO research loop needs for one user turn. */
export type ResearchOrchestrationInput = {
  /** Earlier turns, oldest first (`buildResearchConversation`); '' on a first message. */
  conversation?: string;
  userId: string;
  userToken: string;
  threadId: string;
  intent: string;
  providerId?: string;
  forcedProvider?: string;
  forcedModel?: string;
  /**
   * Multimodal batch 8 — a short, bounded digest of the attachments' derived
   * text (transcript / OCR) for the planner. Absent when there is none.
   */
  attachmentDigest?: string;
  /**
   * Set when the user asked about the platform itself: the platform's public
   * site is crawled directly, with no planner call (ADR-136).
   */
  selfSiteUrl?: string;
};

/** The research engine's request fields (B1/B2) before they are bounded for the wire (`buildResearchEngineFields`). */
export type ResearchEngineFieldsInput = {
  threadId?: string;
  queries?: readonly string[];
  languages?: readonly string[];
  platforms?: readonly ResearchPlatformCategory[];
  depth?: number;
  round?: number;
  excludeUrls?: readonly string[];
};

/** What one AUTO research turn tracks across its steps and rounds (research engine B2). */
export type ResearchTurnState = {
  /** When the turn's research began; rounds 2+ start only within `RESEARCH_ROUNDS_BUDGET_MS` of it. */
  startedAt: number;
  /** The thread's Stop signal, when Stop can reach this turn. */
  signal?: AbortSignal;
  /** Every query searched so far this turn (as typed); a gap check's repeat is never searched again. */
  queriesRun: string[];
};

/** One search run of a turn: its round, its queries and what earlier steps already read. */
export type ResearchSearchStep = {
  round: number;
  /** The primary query; null searches the user's message itself. */
  query: string | null;
  /** Extra queries for this run (already without the primary). */
  queries: readonly string[];
  languages: readonly string[];
  platforms: readonly ResearchPlatformCategory[];
  depth: number;
  /** URLs already read earlier in this turn: never fetched again. */
  excludeUrls: readonly string[];
};

/** What a later round keeps from the first: its number, the depth and the languages; the gap check adds the queries. */
export type ResearchRoundStep = {
  round: number;
  /** What the gap check judges: the message, plus the standalone search it was resolved to. */
  question: string;
  depth: number;
  languages: readonly string[];
  platforms: readonly ResearchPlatformCategory[];
};

/** The thread's Stop controller for a research turn, and whether this turn registered it (and must release it). */
export type ResearchStopClaim = {
  controller?: AbortController;
  owned: boolean;
};
