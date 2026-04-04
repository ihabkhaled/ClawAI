import { HttpStatus, Injectable } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { ContextPacksRepository } from "../repositories/context-packs.repository";
import { type CreateContextPackDto } from "../dto/create-context-pack.dto";
import { type UpdateContextPackDto } from "../dto/update-context-pack.dto";
import { type AddContextPackItemDto } from "../dto/add-context-pack-item.dto";
import { type ContextPackWithItems } from "../types/context-packs.types";

const CONTEXT_PACK_UPDATED_EVENT = "context_pack.updated";

@Injectable()
export class ContextPacksService {
  constructor(
    private readonly contextPacksRepository: ContextPacksRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async createContextPack(userId: string, dto: CreateContextPackDto): Promise<ContextPack> {
    const pack = await this.contextPacksRepository.create({
      userId,
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
    });

    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: pack.id,
      userId,
      action: "created",
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
      throw new EntityNotFoundException("ContextPack", id);
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
      throw new EntityNotFoundException("ContextPack", id);
    }
    this.validateOwnership(pack, userId);

    const updated = await this.contextPacksRepository.update(id, {
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
    });

    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: id,
      userId,
      action: "updated",
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async deleteContextPack(id: string, userId: string): Promise<ContextPack> {
    const pack = await this.contextPacksRepository.findById(id);
    if (!pack) {
      throw new EntityNotFoundException("ContextPack", id);
    }
    this.validateOwnership(pack, userId);

    const deleted = await this.contextPacksRepository.delete(id);

    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId: id,
      userId,
      action: "deleted",
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
      throw new EntityNotFoundException("ContextPack", contextPackId);
    }
    this.validateOwnership(pack, userId);

    const item = await this.contextPacksRepository.addItem({
      contextPackId,
      type: dto.type,
      content: dto.content,
      fileId: dto.fileId,
      sortOrder: dto.sortOrder,
    });

    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId,
      userId,
      action: "item_added",
      timestamp: new Date().toISOString(),
    });

    return item;
  }

  async removeItem(
    contextPackId: string,
    itemId: string,
    userId: string,
  ): Promise<ContextPackItem> {
    const pack = await this.contextPacksRepository.findById(contextPackId);
    if (!pack) {
      throw new EntityNotFoundException("ContextPack", contextPackId);
    }
    this.validateOwnership(pack, userId);

    const removed = await this.contextPacksRepository.removeItem(itemId);

    void this.rabbitMQService.publish(CONTEXT_PACK_UPDATED_EVENT, {
      contextPackId,
      userId,
      action: "item_removed",
      timestamp: new Date().toISOString(),
    });

    return removed;
  }

  private validateOwnership(pack: ContextPack, userId: string): void {
    if (pack.userId !== userId) {
      throw new BusinessException(
        "You do not have access to this context pack",
        "FORBIDDEN_CONTEXT_PACK_ACCESS",
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
