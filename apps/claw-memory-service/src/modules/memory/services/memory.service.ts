import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { type MemoryRecord } from "../../../generated/prisma";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { MemoryRepository } from "../repositories/memory.repository";
import { type CreateMemoryDto } from "../dto/create-memory.dto";
import { type UpdateMemoryDto } from "../dto/update-memory.dto";
import { type ListMemoriesQueryDto } from "../dto/list-memories-query.dto";

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.MESSAGE_COMPLETED,
      async (data: unknown) => {
        await this.handleMessageCompleted(data);
      },
    );
  }

  async createMemory(userId: string, dto: CreateMemoryDto): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.create({
      userId,
      type: dto.type,
      content: dto.content,
      sourceThreadId: dto.sourceThreadId,
      sourceMessageId: dto.sourceMessageId,
    });

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
    const filters = {
      userId,
      type: query.type,
      isEnabled: query.isEnabled,
      search: query.search,
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
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);
    return memory;
  }

  async updateMemory(id: string, userId: string, dto: UpdateMemoryDto): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.findById(id);
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);

    return this.memoryRepository.update(id, {
      content: dto.content,
      isEnabled: dto.isEnabled,
    });
  }

  async deleteMemory(id: string, userId: string): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.findById(id);
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);

    return this.memoryRepository.delete(id);
  }

  async toggleMemory(id: string, userId: string): Promise<MemoryRecord> {
    const memory = await this.memoryRepository.findById(id);
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);

    return this.memoryRepository.update(id, { isEnabled: !memory.isEnabled });
  }

  private validateOwnership(memory: MemoryRecord, userId: string): void {
    if (memory.userId !== userId) {
      throw new BusinessException(
        "You do not have access to this memory",
        "FORBIDDEN_MEMORY_ACCESS",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async handleMessageCompleted(data: unknown): Promise<void> {
    this.logger.debug("Received message.completed event for memory extraction");
    const payload = data as Record<string, unknown>;
    this.logger.debug(`Processing memory extraction for message ${String(payload["messageId"])}`);
  }
}
