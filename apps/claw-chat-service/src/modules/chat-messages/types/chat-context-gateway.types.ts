import { type ChatMessage, type ChatThread, type RoutingMode } from '../../../generated/prisma';

import { type ChatSurface } from '../../../common/enums/chat-surface.enum';
import { type AssembledContext } from './context.types';
import { type ThreadSettings } from './execution.types';
import { type ResearchOptions } from './research-options.types';

/**
 * What a surface has to say to get everything a chat turn gets.
 *
 * An options object, not the seven positional arguments `assemble` takes: the
 * positional form is why callers kept passing `undefined` for things they did
 * not know existed, which is exactly how the coding agent lost cross-thread
 * context and attachments for months without an error.
 */
export type ChatContextRequest = {
  userId: string;
  /** Null for a surface with no thread yet — a lab run started from a bare prompt. */
  threadId: string | null;
  surface: ChatSurface;

  /**
   * Cut the history at this message, so a re-run of an older turn sees what
   * that turn saw rather than everything said since. Chat passes the routed
   * message id; nothing else needs it.
   */
  routedMessageId?: string;
  /** How much history to load. Defaults to the same limit a chat turn uses. */
  historyLimit?: number;

  /** Needed to know the model's real context window, not the conservative default. */
  provider?: string;
  model?: string;

  /**
   * Attachments this run must see, when they are not already on the latest
   * user message — a lab mode receives them on its DTO instead.
   */
  fileIds?: string[];

  /**
   * Appended to the thread's system prompt rather than replacing it.
   *
   * A role pack's persona, a pipeline stage's instruction and the agent's tool
   * catalogue are all this. Replacing the system prompt is what made the judge
   * blind to the user's own instructions.
   */
  personaInstruction?: string;

  /**
   * Web-research evidence a caller already gathered (via
   * `ResearchEnricherManager.enrichForOrchestration`) and wants folded into
   * this context — the 7 lab modes (Repair, Decompose, Best-of-N, Verifier,
   * Pipeline, Cost-Ensemble, Role Pack).
   *
   * Deliberately a SEPARATE field from `personaInstruction`, even though both
   * end up merged into `systemPrompt`: this one goes through
   * `injectResearchEvidenceIntoContext`, which also sets
   * `researchGroundingInjected`, so `hasResearchGrounding` fires and the
   * final-user-turn reminder (`withResearchGrounding`) gets appended — the
   * same fix `d0eb97f10` gave Compare/Consensus/Escalation. Routing this
   * through `personaInstruction` (the pre-fix shape) merged the evidence text
   * in but never set the flag, so the reminder silently never fired for any
   * lab mode. See `AssembledContext.researchGroundingInjected`.
   */
  researchEvidenceInstruction?: string;

  /**
   * What this run is actually about, when that is not the last user turn — a
   * decomposed sub-task, or a verifier checking a specific claim.
   */
  intent?: string;

  routingMode?: RoutingMode;
  research?: ResearchOptions;

  /**
   * Overrides the thread's answer-length reserve for this call.
   *
   * `ThreadSettings.maxTokens` is the ANSWER length (ADR-086), and a surface
   * whose answers are not chat answers needs its own. A coding-agent turn is
   * usually a single tool call, so reserving the user's chat setting would
   * take that much away from the history and attachments the budget exists to
   * protect.
   */
  maxOutputTokens?: number;

  /**
   * Every model this ONE context will be sent to — compare's lanes.
   *
   * The shared context is budgeted against the smallest of their real windows,
   * so no lane is sent more than it can take (rule 51 item 4). Any lane whose
   * window is unknown keeps the conservative fallback for all of them: an
   * unknown lane may be the small one. Ignored when `provider`/`model` is set.
   */
  laneTargets?: readonly ContextLaneTarget[];
};

/** One model a shared context is sent to. */
export type ContextLaneTarget = {
  provider: string;
  model: string;
};

/**
 * The bundle, plus the raw material the caller would otherwise re-fetch.
 *
 * Returning the thread and messages matters: every duplicated `buildContext`
 * existed because callers needed those anyway and it was easier to re-query
 * than to thread them back out.
 */
export type ChatContextBundle = {
  context: AssembledContext;
  thread: ChatThread | null;
  threadSettings: ThreadSettings | undefined;
  /** The history window this context was built from, oldest first. */
  messages: ChatMessage[];
  /** Resolved attachments, whether they came from the request or the thread. */
  fileIds: string[];
  /** Metadata of the latest user message, for callers that record provenance. */
  latestUserMetadata: Record<string, unknown> | null;
};
