import { Injectable, Logger } from '@nestjs/common';
import {
  type RetrievalBundle,
  type RetrievalMemoryItem,
  RetrievalReason,
  type RetrievalRequest,
  type MemoryScope as SharedMemoryScope,
  type MemorySensitivity as SharedMemorySensitivity,
  type MemoryType as SharedMemoryType,
} from '@claw/shared-types';
import { MemoryAuditAction, type MemoryRecord, MemorySensitivity } from '../../../generated/prisma';
import {
  DEFAULT_SEMANTIC_BUDGET_MEMORY,
  MEMORY_RETRIEVAL_MAX,
} from '../../../common/constants/memory-retrieval.constants';
import { MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { MemoryPreferenceService } from '../../memory-preferences/services/memory-preference.service';
import { MemoryUsageService } from '../../memory-usage/services/memory-usage.service';
import { MemoryRepository } from '../repositories/memory.repository';

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name);

  constructor(
    private readonly memoryRepo: MemoryRepository,
    private readonly preferenceService: MemoryPreferenceService,
    private readonly usageService: MemoryUsageService,
    private readonly auditService: MemoryAuditService,
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
      return this.emptyBundle(request, startedAt, warnings);
    }
    if (!request.includeMemory) {
      warnings.push('memory_disabled_for_this_call');
      return this.emptyBundle(request, startedAt, warnings);
    }
    const semanticBudget = Math.min(
      request.semanticBudgetMemory ?? DEFAULT_SEMANTIC_BUDGET_MEMORY,
      MEMORY_RETRIEVAL_MAX,
    );
    const candidates = await this.memoryRepo.findByUserScopeForRetrieval(
      request.userId,
      request.threadId,
      request.workspaceId,
      request.projectId,
      semanticBudget * 3,
    );
    const intent = request.intent.trim();
    const explicitIds = new Set(request.attachedMemoryIds);
    const scored = candidates.map((memory) =>
      this.scoreCandidate(memory, intent, explicitIds.has(memory.id)),
    );
    scored.sort((a, b) => b.score - a.score);
    const memories: RetrievalMemoryItem[] = scored
      .slice(0, semanticBudget)
      .map((entry) => this.toBundleItem(entry.memory, entry.score, entry.reason));
    const latency = Date.now() - startedAt;
    return {
      memories,
      packItems: [],
      assemblyOrder: memories.map((m) => `memory:${m.id}`),
      tokenBudget: request.tokenBudget,
      tokenBudgetUsed: this.estimateBudgetUsed(memories),
      retrievalLatencyMs: latency,
      warnings,
    };
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

  private emptyBundle(
    request: RetrievalRequest,
    startedAt: number,
    warnings: string[],
  ): RetrievalBundle {
    return {
      memories: [],
      packItems: [],
      assemblyOrder: [],
      tokenBudget: request.tokenBudget,
      tokenBudgetUsed: 0,
      retrievalLatencyMs: Date.now() - startedAt,
      warnings,
    };
  }
}
