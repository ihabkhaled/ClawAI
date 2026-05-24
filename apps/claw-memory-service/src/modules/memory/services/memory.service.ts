import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import {
  MemoryAuditAction,
  type MemoryRecord,
  MemorySensitivity,
  MemorySource,
  type MemorySuggestion,
  MemorySuggestionStatus,
} from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { MemoryPreferenceService } from '../../memory-preferences/services/memory-preference.service';
import { MemorySuggestionRepository } from '../../memory-suggestions/repositories/memory-suggestion.repository';
import { MemoryRepository } from '../repositories/memory.repository';
import { MemoryEmbeddingManager } from '../managers/memory-embedding.manager';
import { MemoryExtractionManager } from '../managers/memory-extraction.manager';
import { MemorySensitivityManager } from '../managers/memory-sensitivity.manager';
import { type CreateMemoryDto } from '../dto/create-memory.dto';
import { type UpdateMemoryDto } from '../dto/update-memory.dto';
import { type ListMemoriesQueryDto } from '../dto/list-memories-query.dto';
import { parseOptionalDate } from '../../../common/utilities/date-coerce.utility';

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryExtractionManager: MemoryExtractionManager,
    private readonly sensitivityManager: MemorySensitivityManager,
    private readonly embeddingManager: MemoryEmbeddingManager,
    private readonly suggestionRepository: MemorySuggestionRepository,
    private readonly auditService: MemoryAuditService,
    private readonly preferenceService: MemoryPreferenceService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_COMPLETED, async (data: unknown) => {
      await this.handleMessageCompleted(data);
    });
  }

  async createMemory(userId: string, dto: CreateMemoryDto): Promise<MemoryRecord> {
    this.logger.log(`createMemory: type=${dto.type} userId=${userId} scope=${dto.scope ?? 'USER'}`);
    const sensitivity = dto.sensitivity ?? this.sensitivityManager.classify(dto.content).verdict;
    if (sensitivity === MemorySensitivity.REDACTED && dto.source !== MemorySource.IMPORTED) {
      // Even on manual creation, we never persist raw redacted content without
      // explicit override. Store the redacted preview instead.
      const redacted = this.sensitivityManager.classify(dto.content);
      const memory = await this.memoryRepository.create({
        userId,
        type: dto.type,
        content: redacted.redactedPreview ?? '[REDACTED]',
        sourceThreadId: dto.sourceThreadId,
        sourceMessageId: dto.sourceMessageId,
        scope: dto.scope,
        scopeRef: dto.scopeRef,
        tags: dto.tags,
        category: dto.category,
        priority: dto.priority,
        confidence: dto.confidence,
        source: dto.source ?? MemorySource.USER_MANUAL,
        sensitivity: MemorySensitivity.REDACTED,
        retentionPolicy: dto.retentionPolicy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        pinned: dto.pinned,
        provenanceJson: {
          ...(dto.provenanceJson ?? {}),
          redactionReason: redacted.reason,
          redactedAt: new Date().toISOString(),
        },
      });
      await this.recordAudit(userId, memory.id, MemoryAuditAction.REDACTED, {
        reason: redacted.reason,
      });
      void this.rabbitMQService.publish(EventPattern.MEMORY_REDACTED, {
        memoryId: memory.id,
        userId,
        reason: redacted.reason ?? 'regex_match',
        timestamp: new Date().toISOString(),
      });
      return memory;
    }
    const memory = await this.memoryRepository.create({
      userId,
      type: dto.type,
      content: dto.content,
      sourceThreadId: dto.sourceThreadId,
      sourceMessageId: dto.sourceMessageId,
      scope: dto.scope,
      scopeRef: dto.scopeRef,
      tags: dto.tags,
      category: dto.category,
      priority: dto.priority,
      confidence: dto.confidence,
      source: dto.source ?? MemorySource.USER_MANUAL,
      sensitivity,
      retentionPolicy: dto.retentionPolicy,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      pinned: dto.pinned,
      provenanceJson: dto.provenanceJson,
    });
    await this.recordAudit(userId, memory.id, MemoryAuditAction.CREATED, {
      source: memory.source,
    });
    // Fire-and-forget embedding; failure is logged inside the manager and is
    // non-blocking on the create response.
    void this.embeddingManager.embedOne(memory.id, memory.content);
    void this.rabbitMQService.publish(EventPattern.MEMORY_EXTRACTED, {
      memoryId: memory.id,
      userId,
      type: memory.type,
      timestamp: new Date().toISOString(),
    });
    return memory;
  }

  async getMemories(
    userId: string,
    query: ListMemoriesQueryDto,
  ): Promise<PaginatedResult<MemoryRecord>> {
    this.logger.debug(
      `getMemories: userId=${userId} page=${String(query.page)} sort=${query.sort}`,
    );
    const filters = {
      userId,
      type: query.type,
      isEnabled: query.isEnabled,
      search: query.search,
      scope: query.scope,
      scopeRef: query.scopeRef,
      source: query.source,
      sensitivity: query.sensitivity,
      tag: query.tag,
      category: query.category,
      pinnedOnly: query.pinnedOnly,
      sort: query.sort,
    };
    const [memories, total] = await Promise.all([
      this.memoryRepository.findAll(filters, query.page, query.limit),
      this.memoryRepository.countAll(filters),
    ]);
    return {
      data: memories,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getMemory(id: string, userId: string): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.findById(id);
    if (!memory) throw new EntityNotFoundException('MemoryRecord', id);
    this.validateOwnership(memory, userId);
    return memory;
  }

  async updateMemory(id: string, userId: string, dto: UpdateMemoryDto): Promise<MemoryRecord> {
    this.logger.log(`updateMemory: id=${id} userId=${userId}`);
    const memory = await this.memoryRepository.findById(id);
    if (!memory) throw new EntityNotFoundException('MemoryRecord', id);
    this.validateOwnership(memory, userId);
    const updated = await this.memoryRepository.update(id, {
      content: dto.content,
      isEnabled: dto.isEnabled,
      scope: dto.scope,
      scopeRef: dto.scopeRef,
      tags: dto.tags,
      category: dto.category,
      priority: dto.priority,
      retentionPolicy: dto.retentionPolicy,
      expiresAt: parseOptionalDate(dto.expiresAt),
      sensitivity: dto.sensitivity,
      pinned: dto.pinned,
      pausedUntil: parseOptionalDate(dto.pausedUntil),
    });
    await this.recordAudit(userId, id, MemoryAuditAction.UPDATED, { fields: Object.keys(dto) });
    if (dto.content !== undefined && dto.content !== memory.content) {
      // Content changed → re-embed.
      void this.embeddingManager.embedOne(updated.id, updated.content);
    }
    return updated;
  }

  async deleteMemory(id: string, userId: string, confirmForget: boolean): Promise<MemoryRecord> {
    if (!confirmForget) {
      throw new BusinessException(
        'Forget confirmation required',
        'FORGET_CONFIRMATION_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.logger.log(`deleteMemory: id=${id} userId=${userId}`);
    const memory = await this.memoryRepository.findById(id);
    if (!memory) throw new EntityNotFoundException('MemoryRecord', id);
    this.validateOwnership(memory, userId);
    const deleted = await this.memoryRepository.delete(id);
    await this.recordAudit(userId, id, MemoryAuditAction.DELETED, { type: deleted.type });
    void this.rabbitMQService.publish(EventPattern.MEMORY_FORGOTTEN, {
      memoryId: id,
      userId,
      reason: 'user_forget',
      timestamp: new Date().toISOString(),
    });
    return deleted;
  }

  async toggleMemory(id: string, userId: string): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.findById(id);
    if (!memory) throw new EntityNotFoundException('MemoryRecord', id);
    this.validateOwnership(memory, userId);
    const toggled = await this.memoryRepository.update(id, { isEnabled: !memory.isEnabled });
    await this.recordAudit(userId, id, MemoryAuditAction.TOGGLED, { isEnabled: toggled.isEnabled });
    return toggled;
  }

  async getMemoriesForContext(userId: string, limit: number): Promise<MemoryRecord[]> {
    const preference = await this.preferenceService.get(userId);
    if (preference.pausedAll) {
      this.logger.debug(`getMemoriesForContext: userId=${userId} paused — returning []`);
      return [];
    }
    return this.memoryRepository.findEnabledByUserId(userId, limit);
  }

  private validateOwnership(memory: MemoryRecord, userId: string): void {
    if (memory.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this memory',
        'FORBIDDEN_MEMORY_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async recordAudit(
    userId: string,
    memoryId: string | null,
    action: MemoryAuditAction,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.record({
        userId,
        memoryId: memoryId ?? null,
        action,
        actor: userId,
        details,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`recordAudit: failed — ${msg}`);
    }
  }

  private async handleMessageCompleted(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const messageId = payload['messageId'] as string | undefined;
    const threadId = payload['threadId'] as string | undefined;
    if (!messageId || !threadId) {
      this.logger.warn('handleMessageCompleted: missing messageId or threadId');
      return;
    }
    const assistantContent = payload['content'] as string | undefined;
    const userContent = payload['userContent'] as string | undefined;
    if (!assistantContent) {
      return;
    }
    const userId = (payload['userId'] as string) ?? 'system';
    const preference = await this.preferenceService.get(userId);
    if (preference.pausedAll) {
      this.logger.debug(`handleMessageCompleted: extraction skipped — userId=${userId} paused`);
      return;
    }
    const extracted = await this.memoryExtractionManager.extract(
      userContent ?? '',
      assistantContent,
    );
    if (extracted.length === 0) return;
    for (const memory of extracted) {
      // Use the Ollama-backed classifier here — extraction runs offline and
      // can afford the extra latency for the ambiguous-case verdict.
      const sensitivity = await this.sensitivityManager.classifyWithOllama(memory.content);
      const isDuplicate = await this.memoryRepository.existsSimilar(
        userId,
        memory.type,
        memory.content,
      );
      if (isDuplicate) {
        continue;
      }
      const suggestion = await this.suggestionRepository.create({
        userId,
        type: memory.type,
        content:
          sensitivity.verdict === MemorySensitivity.REDACTED
            ? (sensitivity.redactedPreview ?? '[REDACTED]')
            : memory.content,
        confidence: memory.confidence ?? 0.7,
        sensitivity: sensitivity.verdict,
        reason: sensitivity.reason ?? memory.reason ?? null,
        sourceThreadId: threadId,
        sourceMessageId: messageId,
      });
      void this.rabbitMQService.publish(EventPattern.MEMORY_SUGGESTED, {
        suggestionId: suggestion.id,
        userId,
        type: suggestion.type,
        confidence: suggestion.confidence,
        sensitivity: suggestion.sensitivity,
        sourceThreadId: threadId,
        sourceMessageId: messageId,
        timestamp: new Date().toISOString(),
      });
      if (
        suggestion.sensitivity === MemorySensitivity.NORMAL &&
        suggestion.confidence >= preference.autoApproveThreshold
      ) {
        await this.autoApproveSuggestion(suggestion, userId);
      }
    }
  }

  private async autoApproveSuggestion(suggestion: MemorySuggestion, userId: string): Promise<void> {
    const memory = await this.memoryRepository.create({
      userId,
      type: suggestion.type,
      content: suggestion.content,
      sourceThreadId: suggestion.sourceThreadId ?? undefined,
      sourceMessageId: suggestion.sourceMessageId ?? undefined,
      source: MemorySource.AI_EXTRACTED,
      sensitivity: suggestion.sensitivity,
      confidence: suggestion.confidence,
      provenanceJson: { suggestionId: suggestion.id, autoApproved: true },
    });
    await this.suggestionRepository.decide(suggestion.id, {
      status: MemorySuggestionStatus.AUTO_APPROVED,
      decidedBy: 'auto',
      resultingMemoryId: memory.id,
    });
    await this.recordAudit(userId, memory.id, MemoryAuditAction.APPROVED, {
      suggestionId: suggestion.id,
      automated: true,
    });
    void this.rabbitMQService.publish(EventPattern.MEMORY_APPROVED, {
      memoryId: memory.id,
      suggestionId: suggestion.id,
      userId,
      automated: true,
      timestamp: new Date().toISOString(),
    });
  }
}
