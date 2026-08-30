import {
  type ContextPackItemType,
  type MemoryScope,
  type MemorySensitivity,
  type MemoryType,
  type RetrievalBundle,
  type RetrievalConversationSummary,
  RetrievalReason,
} from '@claw/shared-types';
import type { AssembledContext } from '../../modules/chat-messages/types/context.types';

/**
 * Integration V2 — synthesize a RetrievalBundle from the existing
 * AssembledContext. The bundle is stored as the per-message receipt that
 * powers the "why was this used?" surface. Scores are approximated since the
 * existing assembly path doesn't track per-item cosines — the next session
 * can replace this with the actual retrieve() result for higher fidelity.
 */
export function receiptFromAssembledContext(
  context: AssembledContext,
  tokenBudgetUsed: number,
): RetrievalBundle {
  const memories = context.memories.map((m) => ({
    id: m.id,
    type: m.type as MemoryType,
    content: m.content,
    scope: 'USER' as MemoryScope,
    scopeRef: null,
    score: 0.5,
    reason: RetrievalReason.INTENT_MATCH,
    sensitivity: 'NORMAL' as MemorySensitivity,
    sourceThreadId: null,
    sourceMessageId: null,
  }));
  const packItems = context.contextPackItems.map((it, index) => ({
    id: `pack-item-${String(index)}`,
    contextPackId: 'unknown',
    itemType: (it.type ?? 'TEXT') as ContextPackItemType,
    content: it.content,
    score: 0.5,
    reason: RetrievalReason.EXPLICIT_ATTACH,
    pinned: false,
    tokenCountEstimate: Math.ceil((it.content ?? '').length / 4),
  }));
  return {
    memories,
    packItems,
    assemblyOrder: [
      ...(context.conversationManifest?.includedMessageIds ?? []).map((id) => `message:${id}`),
      ...(context.crossThread?.selections ?? []).map(
        (selection) => `prior-message:${selection.messageId}`,
      ),
      ...memories.map((m) => `memory:${m.id}`),
      ...packItems.map((p) => `pack:${p.id}`),
    ],
    tokenBudget: context.tokenBudget,
    tokenBudgetUsed,
    retrievalLatencyMs: context.conversationManifest?.retrievalMs ?? 0,
    warnings: context.conversationManifest?.warnings ?? [],
    conversation: conversationSummary(context),
  };
}

/**
 * The conversational half of the receipt.
 *
 * This is the part that answers "why did the AI forget this?". Everything here
 * is derived from the composer's own decision record, not recomputed, so the
 * receipt cannot disagree with what was actually sent.
 */
function conversationSummary(context: AssembledContext): RetrievalConversationSummary | undefined {
  // A receipt is a diagnostic artifact. It must never be the reason a
  // generation fails, so a context built by a path that predates the manifest
  // yields no conversation summary rather than a thrown TypeError.
  const manifest = context.conversationManifest;
  if (manifest === undefined || manifest === null) {
    return undefined;
  }
  const omissionReasons: Record<string, string> = {};
  for (const omitted of manifest.omitted) {
    omissionReasons[omitted.messageId] = omitted.reason;
  }
  return {
    totalThreadMessages: manifest.totalThreadMessages,
    includedMessageIds: manifest.includedMessageIds,
    includedTurnCount: manifest.includedTurnCount,
    omittedMessageIds: manifest.omitted.map((omitted) => omitted.messageId),
    omissionReasons,
    estimatedInputTokens: manifest.estimatedInputTokens,
    contextWindowTokens: manifest.budget.contextWindowTokens,
    reservedOutputTokens: manifest.budget.reservedOutputTokens,
    availableInputTokens: manifest.budget.availableInputTokens,
    contextWindowSource: manifest.budget.source,
    referenceSignals: manifest.referenceSignal.signals,
    priorThreadsSearched: context.crossThread?.searchedThreadIds ?? [],
    priorThreadsUsed: context.crossThread?.usedThreadIds ?? [],
    priorMessageIds: (context.crossThread?.selections ?? []).map(
      (selection) => selection.messageId,
    ),
    crossThreadSkipReason: context.crossThread?.skippedReason ?? null,
    retrievalMs: manifest.retrievalMs,
    selectionMs: manifest.selectionMs,
  };
}
