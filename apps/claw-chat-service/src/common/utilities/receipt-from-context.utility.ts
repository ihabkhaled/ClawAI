import {
  type ContextPackItemType,
  type MemoryScope,
  type MemorySensitivity,
  type MemoryType,
  type RetrievalBundle,
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
      ...memories.map((m) => `memory:${m.id}`),
      ...packItems.map((p) => `pack:${p.id}`),
    ],
    tokenBudget: context.tokenBudget,
    tokenBudgetUsed,
    retrievalLatencyMs: 0,
    warnings: [],
  };
}
