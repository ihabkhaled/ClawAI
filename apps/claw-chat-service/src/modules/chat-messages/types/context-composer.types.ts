import { type ChatMessage } from '../../../generated/prisma';
import { type ContextOmissionReason } from '../enums/context-omission-reason.enum';
import { type ContextPriority } from '../enums/context-priority.enum';

/**
 * The four numbers that were previously one number called `maxTokens`.
 *
 * `maxTokens` is a thread setting meaning "how long may the answer be". It was
 * also used as the size of the whole prompt, so a user shortening their replies
 * silently shortened their history, and a 1M-token model was handed 16k
 * characters. Those are different quantities and they now have different names.
 */
export type ModelTokenBudget = {
  /** The model's real context window. From the model catalog where known. */
  contextWindowTokens: number;
  /** Held back so the answer has somewhere to go. Never spent on input. */
  reservedOutputTokens: number;
  /** System prompt, memories, context packs, files, citations. */
  systemOverheadTokens: number;
  /** Tool schemas and tool transcripts, when the runtime lane is active. */
  toolOverheadTokens: number;
  /** What conversational history may actually spend. The only input budget. */
  availableInputTokens: number;
  /** Where `contextWindowTokens` came from, for the manifest. */
  source: 'MODEL_CATALOG' | 'PROVIDER_DEFAULT' | 'CONSERVATIVE_FALLBACK';
};

/**
 * A user message and every message that answered it.
 *
 * Selection works in turns, not messages, because half a turn is worse than
 * none: an assistant answer with no question reads to the next model as an
 * unprompted assertion, and a question with no answer invites it to answer
 * again. `slice(-20)` split turns at the boundary roughly half the time.
 */
export type ConversationTurn = {
  index: number;
  userMessage: ChatMessage | null;
  responses: ChatMessage[];
  messages: ChatMessage[];
  estimatedTokens: number;
};

export type ScoredTurn = {
  turn: ConversationTurn;
  priority: ContextPriority;
  score: number;
  reasons: string[];
};

export type OmittedMessage = {
  messageId: string;
  role: string;
  reason: ContextOmissionReason;
  score: number;
};

/**
 * The complete, auditable account of one generation's conversational context.
 *
 * Written to the context receipt so a support engineer answering "why did the
 * AI forget this?" has an answer that is not a guess.
 */
export type ConversationContextManifest = {
  totalThreadMessages: number;
  includedMessageIds: string[];
  includedTurnCount: number;
  omitted: OmittedMessage[];
  estimatedInputTokens: number;
  budget: ModelTokenBudget;
  referenceSignal: ReferenceSignal;
  warnings: string[];
};

export type SelectedConversation = {
  included: ChatMessage[];
  manifest: ConversationContextManifest;
};

/**
 * How strongly this prompt points at something said earlier.
 *
 * Replaces a boolean produced by one regex of sixteen literal words. That
 * regex answered "false" for `build it`, `implement it`, `use option 3`,
 * `what did you recommend before?` and `make the backend now` — and answering
 * false was what removed the history.
 */
export type ReferenceSignal = {
  /** True when the prompt cannot be understood on its own. */
  referential: boolean;
  /** 0..1. Feeds ranking; it never gates history on its own. */
  strength: number;
  /** Which detectors fired, for the manifest and for tests. */
  signals: string[];
};

/** Everything `resolveModelTokenBudget` needs to split a window into parts. */
export type ModelTokenBudgetInput = {
  /** From the model catalog. `null` when the row has not been enriched. */
  contextWindowTokens: number | null | undefined;
  provider: string | null | undefined;
  /** The thread's `maxTokens`. OUTPUT length only — never an input budget. */
  requestedOutputTokens: number | null | undefined;
  systemOverheadTokens: number;
  toolOverheadTokens: number;
};
