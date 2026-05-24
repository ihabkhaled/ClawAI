import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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
import type { PaginatedResult } from '../../../common/types';
import { MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { MemoryRepository } from '../../memory/repositories/memory.repository';
import { MemorySuggestionRepository } from '../repositories/memory-suggestion.repository';
import type { ApproveSuggestionDto } from '../dto/approve-suggestion.dto';
import type { ListMemorySuggestionsQueryDto } from '../dto/list-memory-suggestions-query.dto';
import type { RejectSuggestionDto } from '../dto/reject-suggestion.dto';
import type { BulkApprovalResult } from '../types/memory-suggestion.types';

@Injectable()
export class MemorySuggestionService {
  private readonly logger = new Logger(MemorySuggestionService.name);

  constructor(
    private readonly suggestionRepo: MemorySuggestionRepository,
    private readonly memoryRepo: MemoryRepository,
    private readonly auditService: MemoryAuditService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async list(
    userId: string,
    query: ListMemorySuggestionsQueryDto,
  ): Promise<PaginatedResult<MemorySuggestion>> {
    this.logger.debug(
      `list: userId=${userId} status=${query.status ?? 'any'} page=${String(query.page)}`,
    );
    const filters = { userId, status: query.status };
    const [data, total] = await Promise.all([
      this.suggestionRepo.findAll(filters, query.page, query.limit),
      this.suggestionRepo.countAll(filters),
    ]);
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async approve(
    suggestionId: string,
    userId: string,
    dto: ApproveSuggestionDto,
  ): Promise<MemoryRecord> {
    this.logger.log(`approve: suggestionId=${suggestionId} userId=${userId}`);
    const suggestion = await this.assertOwnedSuggestion(suggestionId, userId);
    if (suggestion.status === MemorySuggestionStatus.APPROVED && suggestion.resultingMemoryId) {
      const existing = await this.memoryRepo.findById(suggestion.resultingMemoryId);
      if (existing) {
        return existing;
      }
    }
    if (this.isDecided(suggestion)) {
      throw new BusinessException(
        'Suggestion already decided',
        'SUGGESTION_ALREADY_DECIDED',
        HttpStatus.CONFLICT,
      );
    }
    if (suggestion.sensitivity === MemorySensitivity.REDACTED && dto.editedContent === undefined) {
      throw new BusinessException(
        'Edit required to approve a redacted suggestion',
        'REDACTED_REQUIRES_EDIT',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const memory = await this.memoryRepo.create({
      userId,
      type: suggestion.type,
      content: dto.editedContent ?? suggestion.content,
      sourceThreadId: suggestion.sourceThreadId ?? undefined,
      sourceMessageId: suggestion.sourceMessageId ?? undefined,
      scope: dto.scope,
      scopeRef: dto.scopeRef,
      retentionPolicy: dto.retentionPolicy,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      source: MemorySource.AI_EXTRACTED,
      sensitivity: suggestion.sensitivity,
      confidence: suggestion.confidence,
      provenanceJson: { suggestionId },
    });
    await this.suggestionRepo.decide(suggestionId, {
      status: MemorySuggestionStatus.APPROVED,
      decidedBy: userId,
      resultingMemoryId: memory.id,
    });
    await this.auditService.record({
      userId,
      memoryId: memory.id,
      action: MemoryAuditAction.APPROVED,
      actor: userId,
      details: { suggestionId },
    });
    void this.rabbitMQService.publish(EventPattern.MEMORY_APPROVED, {
      memoryId: memory.id,
      suggestionId,
      userId,
      automated: false,
      timestamp: new Date().toISOString(),
    });
    return memory;
  }

  async reject(
    suggestionId: string,
    userId: string,
    dto: RejectSuggestionDto,
  ): Promise<MemorySuggestion> {
    this.logger.log(`reject: suggestionId=${suggestionId} userId=${userId}`);
    const suggestion = await this.assertOwnedSuggestion(suggestionId, userId);
    if (this.isDecided(suggestion)) {
      throw new BusinessException(
        'Suggestion already decided',
        'SUGGESTION_ALREADY_DECIDED',
        HttpStatus.CONFLICT,
      );
    }
    const decided = await this.suggestionRepo.decide(suggestionId, {
      status: MemorySuggestionStatus.REJECTED,
      decidedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: MemoryAuditAction.REJECTED,
      actor: userId,
      details: {
        suggestionId,
        reason: dto.reason ?? null,
        suppressSimilar: dto.suppressSimilar,
      },
    });
    void this.rabbitMQService.publish(EventPattern.MEMORY_REJECTED, {
      suggestionId,
      userId,
      reason: dto.reason ?? null,
      suppressSimilar: dto.suppressSimilar,
      timestamp: new Date().toISOString(),
    });
    return decided;
  }

  async dismiss(suggestionId: string, userId: string): Promise<MemorySuggestion> {
    this.logger.log(`dismiss: suggestionId=${suggestionId} userId=${userId}`);
    const suggestion = await this.assertOwnedSuggestion(suggestionId, userId);
    if (this.isDecided(suggestion)) {
      return suggestion;
    }
    return this.suggestionRepo.decide(suggestionId, {
      status: MemorySuggestionStatus.DISMISSED,
      decidedBy: userId,
    });
  }

  async bulkApprove(suggestionIds: string[], userId: string): Promise<BulkApprovalResult> {
    this.logger.log(`bulkApprove: userId=${userId} count=${String(suggestionIds.length)}`);
    const suggestions = await this.suggestionRepo.findByIds(suggestionIds);
    const approved: string[] = [];
    const skipped: BulkApprovalResult['skipped'] = [];
    for (const s of suggestions) {
      if (s.userId !== userId) {
        skipped.push({ suggestionId: s.id, reason: 'FORBIDDEN' });
        continue;
      }
      if (this.isDecided(s)) {
        skipped.push({ suggestionId: s.id, reason: 'ALREADY_DECIDED' });
        continue;
      }
      if (s.sensitivity !== MemorySensitivity.NORMAL) {
        skipped.push({ suggestionId: s.id, reason: 'SENSITIVE_REQUIRES_REVIEW' });
        continue;
      }
      try {
        await this.approve(s.id, userId, {});
        approved.push(s.id);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown';
        skipped.push({ suggestionId: s.id, reason: msg });
      }
    }
    return { approved, skipped };
  }

  private async assertOwnedSuggestion(
    suggestionId: string,
    userId: string,
  ): Promise<MemorySuggestion> {
    const suggestion = await this.suggestionRepo.findById(suggestionId);
    if (!suggestion) {
      throw new EntityNotFoundException('MemorySuggestion', suggestionId);
    }
    if (suggestion.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this suggestion',
        'FORBIDDEN_SUGGESTION_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
    return suggestion;
  }

  private isDecided(s: MemorySuggestion): boolean {
    return (
      s.status === MemorySuggestionStatus.APPROVED ||
      s.status === MemorySuggestionStatus.REJECTED ||
      s.status === MemorySuggestionStatus.AUTO_APPROVED ||
      s.status === MemorySuggestionStatus.DISMISSED ||
      s.status === MemorySuggestionStatus.EXPIRED
    );
  }
}
