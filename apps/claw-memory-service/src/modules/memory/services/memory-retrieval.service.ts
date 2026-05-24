import { Injectable, Logger } from '@nestjs/common';
import {
  type RetrievalBundle,
  type RetrievalMemoryItem,
  type RetrievalPackItem,
  RetrievalReason,
  type RetrievalRequest,
  type ContextPackItemType as SharedContextPackItemType,
  type MemoryScope as SharedMemoryScope,
  type MemorySensitivity as SharedMemorySensitivity,
  type MemoryType as SharedMemoryType,
} from '@claw/shared-types';
import {
  type ContextPackItem,
  MemoryAuditAction,
  type MemoryRecord,
  MemorySensitivity,
} from '../../../generated/prisma';
import { ContextPackEmbeddingManager } from '../../context-packs/managers/context-pack-embedding.manager';
import { ContextPacksRepository } from '../../context-packs/repositories/context-packs.repository';
import {
  CONTEXT_RETRIEVAL_MAX,
  DEFAULT_SEMANTIC_BUDGET_CONTEXT,
  DEFAULT_SEMANTIC_BUDGET_MEMORY,
  MEMORY_RETRIEVAL_MAX,
} from '../../../common/constants/memory-retrieval.constants';
import { MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { MemoryPreferenceService } from '../../memory-preferences/services/memory-preference.service';
import { MemoryUsageService } from '../../memory-usage/services/memory-usage.service';
import { MemoryEmbeddingManager } from '../managers/memory-embedding.manager';
import { MemoryRepository } from '../repositories/memory.repository';

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name);

  constructor(
    private readonly memoryRepo: MemoryRepository,
    private readonly preferenceService: MemoryPreferenceService,
    private readonly usageService: MemoryUsageService,
    private readonly auditService: MemoryAuditService,
    private readonly embeddingManager: MemoryEmbeddingManager,
    private readonly contextPacksRepo: ContextPacksRepository,
    private readonly packEmbeddingManager: ContextPackEmbeddingManager,
  ) {}

  async retrieve(request: RetrievalRequest): Promise<RetrievalBundle> {
    const startedAt = Date.now();
    this.logger.debug(
      `retrieve: userId=${request.userId} threadId=${request.threadId ?? '(none)'} includeMemory=${String(request.includeMemory)} budget=${String(request.tokenBudget)}`,
    );
    const warnings: string[] = [];
    const preference = await this.preferenceService.get(request.userId);
    if (preference.pausedAll) {
      warnings.push('memory_paused_globally');
    }
    const memoryAllowed = request.includeMemory && !preference.pausedAll;
    if (!request.includeMemory) {
      warnings.push('memory_disabled_for_this_call');
    }
    const semanticBudget = Math.min(
      request.semanticBudgetMemory ?? DEFAULT_SEMANTIC_BUDGET_MEMORY,
      MEMORY_RETRIEVAL_MAX,
    );
    const candidates = memoryAllowed
      ? await this.memoryRepo.findByUserScopeForRetrieval(
          request.userId,
          request.threadId,
          request.workspaceId,
          request.projectId,
          semanticBudget * 3,
        )
      : [];
    const intent = request.intent.trim();
    const explicitIds = new Set(request.attachedMemoryIds);
    // Run semantic search in parallel; failure is logged inside the manager
    // and returns []. Lexical scoring still works as the fallback.
    const semanticHits = memoryAllowed
      ? await this.embeddingManager.search(
          {
            userId: request.userId,
            threadId: request.threadId,
            workspaceId: request.workspaceId,
            projectId: request.projectId,
          },
          intent,
          semanticBudget,
        )
      : [];
    const semanticScoreMap = new Map<string, number>(
      semanticHits.map((hit) => [hit.memoryId, hit.score]),
    );
    if (semanticHits.length > 0) {
      this.logger.debug(`retrieve: semantic hits=${String(semanticHits.length)}`);
    } else if (intent.length > 0) {
      warnings.push('semantic_fallback_to_lexical');
    }
    const scored = candidates.map((memory) =>
      this.scoreCandidate(
        memory,
        intent,
        explicitIds.has(memory.id),
        semanticScoreMap.get(memory.id),
      ),
    );
    scored.sort((a, b) => b.score - a.score);
    const memories: RetrievalMemoryItem[] = memoryAllowed
      ? scored
          .slice(0, semanticBudget)
          .map((entry) => this.toBundleItem(entry.memory, entry.score, entry.reason))
      : [];

    const packItems: RetrievalPackItem[] = request.includeContext
      ? await this.buildPackItems(request, intent, warnings)
      : [];
    if (!request.includeContext) {
      warnings.push('context_disabled_for_this_call');
    }

    const latency = Date.now() - startedAt;
    const assemblyOrder = [
      ...memories.map((m) => `memory:${m.id}`),
      ...packItems.map((p) => `pack:${p.id}`),
    ];
    const budgetUsed = this.estimateBudgetUsed(memories) + this.estimatePackBudget(packItems);
    return {
      memories,
      packItems,
      assemblyOrder,
      tokenBudget: request.tokenBudget,
      tokenBudgetUsed: budgetUsed,
      retrievalLatencyMs: latency,
      warnings,
    };
  }

  private async buildPackItems(
    request: RetrievalRequest,
    intent: string,
    warnings: string[],
  ): Promise<RetrievalPackItem[]> {
    const packIds = request.attachedPackIds.slice(0, 20);
    if (packIds.length === 0) {
      return [];
    }
    const packs = await Promise.all(
      packIds.map((id) => this.contextPacksRepo.findById(id).catch(() => null)),
    );
    const visiblePacks = packs.filter(
      (pack): pack is NonNullable<typeof pack> =>
        pack !== null && pack.isEnabled && this.isUserVisible(pack, request.userId),
    );
    if (visiblePacks.length === 0) {
      return [];
    }
    const items: ContextPackItem[] = visiblePacks.flatMap((pack) =>
      pack.items.filter((it) => it.isEnabled),
    );
    if (items.length === 0) {
      return [];
    }
    const contextBudget = Math.min(
      request.semanticBudgetContext ?? DEFAULT_SEMANTIC_BUDGET_CONTEXT,
      CONTEXT_RETRIEVAL_MAX,
    );
    const visiblePackIds = visiblePacks.map((p) => p.id);
    const semanticHits =
      intent.length > 0
        ? await this.packEmbeddingManager.searchItems(visiblePackIds, intent, contextBudget)
        : [];
    if (semanticHits.length === 0 && intent.length > 0) {
      warnings.push('pack_semantic_fallback_to_pinned');
    }
    const scoreMap = new Map<string, number>(semanticHits.map((h) => [h.itemId, h.score]));
    const sorted = [...items].sort(
      (a, b) => this.scorePackItem(b, scoreMap) - this.scorePackItem(a, scoreMap),
    );
    return sorted.slice(0, contextBudget).map((item) => ({
      id: item.id,
      contextPackId: item.contextPackId,
      itemType: item.itemType as SharedContextPackItemType,
      content: item.compressedSummary ?? item.content,
      score: scoreMap.get(item.id) ?? (item.pinned ? 0.95 : 0.5),
      reason: item.pinned ? RetrievalReason.PINNED : RetrievalReason.EXPLICIT_ATTACH,
      pinned: item.pinned,
      tokenCountEstimate: item.tokenCountEstimate,
    }));
  }

  private scorePackItem(item: ContextPackItem, scoreMap: Map<string, number>): number {
    if (item.pinned) {
      return 1;
    }
    return scoreMap.get(item.id) ?? 0;
  }

  private estimatePackBudget(items: RetrievalPackItem[]): number {
    let chars = 0;
    for (const item of items) {
      chars += (item.content ?? '').length;
    }
    return Math.ceil(chars / 4);
  }

  private isUserVisible(
    pack: { userId: string; ownerUserId: string; visibility: string },
    userId: string,
  ): boolean {
    if (pack.userId === userId || pack.ownerUserId === userId) {
      return true;
    }
    // Cross-user access is restricted; workspace-level sharing requires the
    // chat-service to have already validated the user's workspace membership.
    return false;
  }

  async recordUsage(
    rows: Array<{
      memoryId: string;
      userId: string;
      threadId: string;
      messageId: string;
      score: number;
      reason: string;
    }>,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const count = await this.usageService.record(rows);
    for (const row of rows) {
      await this.memoryRepo.incrementUseCount(row.memoryId).catch((error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`recordUsage: failed to increment useCount for ${row.memoryId} — ${msg}`);
      });
      await this.auditService
        .record({
          userId: row.userId,
          memoryId: row.memoryId,
          action: MemoryAuditAction.USED,
          actor: 'chat-service',
          details: {
            threadId: row.threadId,
            messageId: row.messageId,
            score: row.score,
            reason: row.reason,
          },
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : 'unknown';
          this.logger.warn(`recordUsage: audit write failed for ${row.memoryId} — ${msg}`);
        });
    }
    return count;
  }

  private scoreCandidate(
    memory: MemoryRecord,
    intent: string,
    isExplicit: boolean,
    semanticScore: number | undefined,
  ): { memory: MemoryRecord; score: number; reason: RetrievalReason } {
    if (isExplicit) {
      return { memory, score: 1, reason: RetrievalReason.EXPLICIT_ATTACH };
    }
    if (memory.pinned) {
      return { memory, score: 0.95, reason: RetrievalReason.PINNED };
    }
    if (memory.type === 'PREFERENCE') {
      return { memory, score: 0.9, reason: RetrievalReason.PREFERENCE };
    }
    // Prefer semantic cosine when available; fall back to lexical overlap.
    if (semanticScore !== undefined) {
      return { memory, score: semanticScore, reason: RetrievalReason.INTENT_MATCH };
    }
    const overlap = this.tokenOverlap(memory.content, intent);
    return { memory, score: overlap, reason: RetrievalReason.INTENT_MATCH };
  }

  private toBundleItem(
    memory: MemoryRecord,
    score: number,
    reason: RetrievalReason,
  ): RetrievalMemoryItem {
    const sanitizedContent =
      memory.sensitivity === MemorySensitivity.REDACTED ? null : memory.content;
    return {
      id: memory.id,
      type: memory.type as SharedMemoryType,
      content: sanitizedContent,
      scope: memory.scope as SharedMemoryScope,
      scopeRef: memory.scopeRef,
      score,
      reason,
      sensitivity: memory.sensitivity as SharedMemorySensitivity,
      sourceThreadId: memory.sourceThreadId,
      sourceMessageId: memory.sourceMessageId,
    };
  }

  private tokenOverlap(a: string, b: string): number {
    const tokens = (s: string): Set<string> =>
      new Set(
        s
          .toLowerCase()
          .replaceAll(/[^a-z0-9\s]+/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 4),
      );
    const aT = tokens(a);
    const bT = tokens(b);
    if (aT.size === 0 || bT.size === 0) return 0;
    let hits = 0;
    for (const t of aT) {
      if (bT.has(t)) hits += 1;
    }
    return hits / Math.max(Math.min(aT.size, bT.size), 1);
  }

  private estimateBudgetUsed(items: RetrievalMemoryItem[]): number {
    let chars = 0;
    for (const item of items) {
      chars += (item.content ?? '').length;
    }
    return Math.ceil(chars / 4);
  }
}
