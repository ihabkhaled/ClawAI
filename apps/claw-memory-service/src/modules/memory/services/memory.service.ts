import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { type MemoryRecord } from "../../../generated/prisma";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { MemoryRepository } from "../repositories/memory.repository";
import { MemoryExtractionManager } from "../managers/memory-extraction.manager";
import { type CreateMemoryDto } from "../dto/create-memory.dto";
import { type UpdateMemoryDto } from "../dto/update-memory.dto";
import { type ListMemoriesQueryDto } from "../dto/list-memories-query.dto";

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryExtractionManager: MemoryExtractionManager,
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
    this.logger.log(`createMemory: creating ${dto.type} memory for user ${userId}`);
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
    this.logger.log(`updateMemory: updating memory ${id} for user ${userId}`);
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
    this.logger.log(`deleteMemory: deleting memory ${id}`);
    const memory = await this.memoryRepository.findById(id);
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);

    return this.memoryRepository.delete(id);
  }

  async toggleMemory(id: string, userId: string): Promise<MemoryRecord> {
    this.logger.debug(`toggleMemory: toggling memory ${id}`);
    const memory = await this.memoryRepository.findById(id);
    if (!memory) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    this.validateOwnership(memory, userId);

    return this.memoryRepository.update(id, { isEnabled: !memory.isEnabled });
  }

  async getMemoriesForContext(userId: string, limit: number): Promise<MemoryRecord[]> {
    return this.memoryRepository.findEnabledByUserId(userId, limit);
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
    const payload = data as Record<string, unknown>;
    const messageId = payload["messageId"] as string | undefined;
    const threadId = payload["threadId"] as string | undefined;

    if (!messageId || !threadId) {
      this.logger.warn("message.completed missing messageId or threadId");
      return;
    }

    this.logger.log(`Extracting memories from message ${messageId}`);

    // Extract user/assistant content from the event context
    const assistantContent = payload["content"] as string | undefined;
    const userContent = payload["userContent"] as string | undefined;

    if (!assistantContent) {
      this.logger.debug(`No content in event for ${messageId}, skipping extraction`);
      return;
    }

    const extracted = await this.memoryExtractionManager.extract(
      userContent ?? "",
      assistantContent,
    );

    if (extracted.length === 0) {
      this.logger.debug(`No memories extracted from ${messageId}`);
      return;
    }

    const userId = (payload["userId"] as string) ?? "system";

    for (const memory of extracted) {
      // Deduplication: skip if a very similar memory already exists
      const isDuplicate = await this.memoryRepository.existsSimilar(userId, memory.type, memory.content);
      if (isDuplicate) {
        this.logger.debug(`Skipping duplicate memory: [${memory.type}] ${memory.content.slice(0, 50)}...`);
        continue;
      }

      const record = await this.memoryRepository.create({
        userId,
        type: memory.type,
        content: memory.content,
        sourceThreadId: threadId,
        sourceMessageId: messageId,
      });

      void this.rabbitMQService.publish(EventPattern.MEMORY_EXTRACTED, {
        memoryId: record.id,
        userId,
        type: record.type,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Extracted ${String(extracted.length)} memories from ${messageId}`);
  }
}
