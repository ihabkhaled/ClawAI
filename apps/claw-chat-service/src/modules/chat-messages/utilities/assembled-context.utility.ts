import {
  CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
  MIN_RESERVED_OUTPUT_TOKENS,
} from '../constants/context-composer.constants';
import {
  type ConversationContextManifest,
  type ModelTokenBudget,
} from '../types/context-composer.types';
import {
  type CrossThreadRetrievalResult,
  CrossThreadSkipReason,
} from '../types/cross-thread-retrieval.types';

/**
 * The budget to use when nothing is known about the model.
 *
 * Deliberately the conservative window: a call site that has not been taught
 * to pass the real one should send less context, not risk a provider-side
 * truncation that fails the whole generation.
 */
export function fallbackModelTokenBudget(): ModelTokenBudget {
  return {
    contextWindowTokens: CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
    reservedOutputTokens: MIN_RESERVED_OUTPUT_TOKENS,
    systemOverheadTokens: 0,
    toolOverheadTokens: 0,
    availableInputTokens: CONSERVATIVE_CONTEXT_WINDOW_TOKENS - MIN_RESERVED_OUTPUT_TOKENS,
    source: 'CONSERVATIVE_FALLBACK',
  };
}

/** A manifest describing "nothing was selected", for empty or synthetic contexts. */
export function emptyConversationManifest(
  budget: ModelTokenBudget = fallbackModelTokenBudget(),
): ConversationContextManifest {
  return {
    totalThreadMessages: 0,
    includedMessageIds: [],
    includedTurnCount: 0,
    omitted: [],
    estimatedInputTokens: 0,
    budget,
    referenceSignal: { referential: false, strength: 0, signals: [] },
    warnings: [],
    retrievalMs: 0,
    selectionMs: 0,
  };
}

/**
 * "Cross-thread retrieval did not run, because the thread did not ask for it."
 *
 * The default for every construction site that has not been taught about the
 * feature — which is the correct default, since the feature is opt-in.
 */
export function disabledCrossThreadResult(): CrossThreadRetrievalResult {
  return {
    selections: [],
    searchedThreadIds: [],
    usedThreadIds: [],
    skippedReason: CrossThreadSkipReason.DISABLED,
    estimatedTokens: 0,
  };
}
