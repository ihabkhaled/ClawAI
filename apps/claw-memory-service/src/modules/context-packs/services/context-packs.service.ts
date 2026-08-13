import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  type ContextPack,
  type ContextPackItem,
  ContextPackItemType,
} from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { ContextPackEmbeddingManager } from '../managers/context-pack-embedding.manager';
import { ContextPacksRepository } from '../repositories/context-packs.repository';
import { type CreateContextPackDto } from '../dto/create-context-pack.dto';
import { type UpdateContextPackDto } from '../dto/update-context-pack.dto';
import { type AddContextPackItemDto } from '../dto/add-context-pack-item.dto';
import { type ContextPackWithItems } from '../types/context-packs.types';
import { CONTEXT_PACK_UPDATED_EVENT } from '../constants/context-packs.constants';
import { parsePausedUntil } from '../../../common/utilities/date-coerce.utility';
import { ResourceEntitlementService } from '../../../common/services/resource-entitlement.service';

@Injectable()
export class ContextPacksService {
  private readonly logger = new Logger(ContextPacksService.name);

  constructor(
    private readonly contextPacksRepository: ContextPacksRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly embeddingManager: ContextPackEmbeddingManager,
    private readonly entitlementService: ResourceEntitlementService,
  ) {}

  async createContextPack(userId: string, dto: CreateContextPackDto): Promise<ContextPack> {
    this.logger.log(`createContextPack: pack="${dto.name}" userId=${userId}`);
    const entitlements = await this.entitlementService.resolve(userId);
    if (!entitlements.isAdmin && entitlements.plan?.featureGates.allowContextPacks !== true) {
      throw new BusinessException(
        'Context packs are unavailable on this plan',
        'PLAN_FEATURE_DISABLED',
        HttpStatus.FORBIDDEN,
      );
    }
    const pack = await this.contextPacksRepository.createWithinLimit(
      {
        userId,
        ownerUserId: userId,
        name: dto.name,
        description: dto.description,
        scope: dto.scope,
        scopeRef: dto.scopeRef,
        legacyScope: dto.legacyScope,
        tags: dto.tags,
        visibility: dto.visibility,
        color: dto.color,
        icon: dto.icon,
        templateId: dto.templateId,
        pinned: dto.pinned,
      },
      entitlements.isAdmin ? null : (entitlements.plan?.limits.contextPacks ?? 0),
    );
    if (!pack)
      throw new BusinessException(
        'Context pack limit exceeded',
        'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: pack.id,
      userId,
      action: 'created',
      timestamp: new Date().toISOString(),
    });
    return pack;
  }

  async getContextPacks(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResult<ContextPack>> {
    const filters = { userId, search };
    const [packs, total] = await Promise.all([
      this.contextPacksRepository.findAll(filters, page, limit),
      this.contextPacksRepository.countAll(filters),
    ]);
    return {
      data: packs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContextPack(id: string, userId: string): Promise<ContextPackWithItems> {
    const pack = await this.contextPacksRepository.findById(id);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', id);
    }
    this.validateOwnership(pack, userId);
    return pack;
  }

  async updateContextPack(
    id: string,
    userId: string,
    dto: UpdateContextPackDto,
  ): Promise<ContextPack> {
    const pack = await this.contextPacksRepository.findById(id);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', id);
    }
    this.validateOwnership(pack, userId);
    const updated = await this.contextPacksRepository.update(id, {
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      scopeRef: dto.scopeRef === undefined ? undefined : dto.scopeRef,
      tags: dto.tags,
      visibility: dto.visibility,
      isEnabled: dto.isEnabled,
      pausedUntil: parsePausedUntil(dto.pausedUntil),
      pinned: dto.pinned,
      color: dto.color,
      icon: dto.icon,
    });
    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: id,
      userId,
      action: 'updated',
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async deleteContextPack(id: string, userId: string): Promise<ContextPack> {
    this.logger.log(`deleteContextPack: id=${id}`);
    const pack = await this.contextPacksRepository.findById(id);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', id);
    }
    this.validateOwnership(pack, userId);
    const deleted = await this.contextPacksRepository.delete(id);
    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: id,
      userId,
      action: 'deleted',
      timestamp: new Date().toISOString(),
    });
    return deleted;
  }

  async addItem(
    contextPackId: string,
    userId: string,
    dto: AddContextPackItemDto,
  ): Promise<ContextPackItem> {
    const pack = await this.contextPacksRepository.findById(contextPackId);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', contextPackId);
    }
    this.validateOwnership(pack, userId);
    const itemType = this.resolveItemType(dto.itemType, dto.type);
    const item = await this.contextPacksRepository.addItem({
      contextPackId,
      itemType,
      legacyType: dto.type,
      content: dto.content,
      fileId: dto.fileId,
      url: dto.url,
      memoryRefId: dto.memoryRefId,
      sortOrder: dto.sortOrder,
      isEnabled: dto.isEnabled,
      pinned: dto.pinned,
      tokenCountEstimate: dto.content ? Math.ceil(dto.content.length / 4) : 0,
    });
    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId,
      userId,
      action: 'item_added',
      timestamp: new Date().toISOString(),
    });
    // Fire-and-forget embedding — failure is logged inside the manager.
    if (dto.content && dto.content.length > 0) {
      void this.embeddingManager.embedItem(item.id, dto.content);
    }
    return item;
  }

  async removeItem(
    contextPackId: string,
    itemId: string,
    userId: string,
  ): Promise<ContextPackItem> {
    const pack = await this.contextPacksRepository.findById(contextPackId);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', contextPackId);
    }
    this.validateOwnership(pack, userId);
    const removed = await this.contextPacksRepository.removeItem(itemId);
    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId,
      userId,
      action: 'item_removed',
      timestamp: new Date().toISOString(),
    });
    return removed;
  }

  async getContextPackItemsInternal(contextPackId: string): Promise<ContextPackWithItems | null> {
    return this.contextPacksRepository.findById(contextPackId);
  }

  private validateOwnership(pack: ContextPack, userId: string): void {
    if (pack.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this context pack',
        'FORBIDDEN_CONTEXT_PACK_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private resolveItemType(
    explicit: ContextPackItemType | undefined,
    legacy: string | undefined,
  ): ContextPackItemType {
    if (explicit !== undefined) return explicit;
    if (legacy === undefined) return ContextPackItemType.TEXT;
    const lower = legacy.toLowerCase();
    if (lower.startsWith('file')) return ContextPackItemType.FILE;
    if (lower.startsWith('url')) return ContextPackItemType.URL;
    if (lower.startsWith('markdown')) return ContextPackItemType.MARKDOWN;
    if (lower.startsWith('snippet') || lower.startsWith('code')) return ContextPackItemType.SNIPPET;
    if (lower.startsWith('memory')) return ContextPackItemType.MEMORY_REF;
    return ContextPackItemType.TEXT;
  }
}
