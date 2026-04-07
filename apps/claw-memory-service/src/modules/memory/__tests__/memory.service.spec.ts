import { MemoryService } from "../services/memory.service";
import { type MemoryRepository } from "../repositories/memory.repository";
import { type RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { MemoryType } from "../../../generated/prisma";

const mockMemory = {
  id: "mem-1",
  userId: "user-1",
  type: MemoryType.FACT,
  content: "The user prefers dark mode",
  sourceThreadId: null,
  sourceMessageId: null,
  isEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMemoryRepository = (): Record<keyof MemoryRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findEnabledByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
});

describe("MemoryService", () => {
  let service: MemoryService;
  let memoryRepo: ReturnType<typeof mockMemoryRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    memoryRepo = mockMemoryRepository();
    rabbitMQ = mockRabbitMQ();
    service = new MemoryService(
      memoryRepo as unknown as MemoryRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("createMemory", () => {
    it("should create a memory and publish event", async () => {
      memoryRepo.create.mockResolvedValue(mockMemory);

      const result = await service.createMemory("user-1", {
        type: MemoryType.FACT,
        content: "The user prefers dark mode",
      });

      expect(result).toEqual(mockMemory);
      expect(memoryRepo.create).toHaveBeenCalledWith({
        userId: "user-1",
        type: MemoryType.FACT,
        content: "The user prefers dark mode",
        sourceThreadId: undefined,
        sourceMessageId: undefined,
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MEMORY_EXTRACTED,
        expect.objectContaining({
          memoryId: "mem-1",
          userId: "user-1",
          type: MemoryType.FACT,
        }),
      );
    });

    it("should create memory with source references", async () => {
      const memoryWithSource = {
        ...mockMemory,
        sourceThreadId: "thread-1",
        sourceMessageId: "msg-1",
      };
      memoryRepo.create.mockResolvedValue(memoryWithSource);

      const result = await service.createMemory("user-1", {
        type: MemoryType.FACT,
        content: "The user prefers dark mode",
        sourceThreadId: "thread-1",
        sourceMessageId: "msg-1",
      });

      expect(result.sourceThreadId).toBe("thread-1");
      expect(result.sourceMessageId).toBe("msg-1");
    });
  });

  describe("getMemories", () => {
    it("should return paginated memories", async () => {
      memoryRepo.findAll.mockResolvedValue([mockMemory]);
      memoryRepo.countAll.mockResolvedValue(1);

      const result = await service.getMemories("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should pass filters to repository", async () => {
      memoryRepo.findAll.mockResolvedValue([]);
      memoryRepo.countAll.mockResolvedValue(0);

      await service.getMemories("user-1", {
        page: 1,
        limit: 20,
        type: MemoryType.PREFERENCE,
        isEnabled: true,
        search: "dark",
      });

      expect(memoryRepo.findAll).toHaveBeenCalledWith(
        { userId: "user-1", type: MemoryType.PREFERENCE, isEnabled: true, search: "dark" },
        1,
        20,
      );
    });

    it("should calculate totalPages correctly", async () => {
      memoryRepo.findAll.mockResolvedValue([mockMemory]);
      memoryRepo.countAll.mockResolvedValue(45);

      const result = await service.getMemories("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe("getMemory", () => {
    it("should return memory when found and owned by user", async () => {
      memoryRepo.findById.mockResolvedValue(mockMemory);

      const result = await service.getMemory("mem-1", "user-1");

      expect(result).toEqual(mockMemory);
    });

    it("should throw EntityNotFoundException when not found", async () => {
      memoryRepo.findById.mockResolvedValue(null);

      await expect(service.getMemory("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own memory", async () => {
      memoryRepo.findById.mockResolvedValue(mockMemory);

      await expect(service.getMemory("mem-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("updateMemory", () => {
    it("should update memory successfully", async () => {
      const updated = { ...mockMemory, content: "Updated content" };
      memoryRepo.findById.mockResolvedValue(mockMemory);
      memoryRepo.update.mockResolvedValue(updated);

      const result = await service.updateMemory("mem-1", "user-1", {
        content: "Updated content",
      });

      expect(result.content).toBe("Updated content");
      expect(memoryRepo.update).toHaveBeenCalledWith("mem-1", {
        content: "Updated content",
        isEnabled: undefined,
      });
    });

    it("should throw EntityNotFoundException when not found", async () => {
      memoryRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateMemory("nonexistent", "user-1", { content: "New" }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it("should throw BusinessException when user does not own memory", async () => {
      memoryRepo.findById.mockResolvedValue(mockMemory);

      await expect(
        service.updateMemory("mem-1", "other-user", { content: "New" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteMemory", () => {
    it("should delete memory successfully", async () => {
      memoryRepo.findById.mockResolvedValue(mockMemory);
      memoryRepo.delete.mockResolvedValue(mockMemory);

      const result = await service.deleteMemory("mem-1", "user-1");

      expect(result).toEqual(mockMemory);
      expect(memoryRepo.delete).toHaveBeenCalledWith("mem-1");
    });

    it("should throw EntityNotFoundException when not found", async () => {
      memoryRepo.findById.mockResolvedValue(null);

      await expect(service.deleteMemory("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own memory", async () => {
      memoryRepo.findById.mockResolvedValue(mockMemory);

      await expect(service.deleteMemory("mem-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("toggleMemory", () => {
    it("should toggle enabled memory to disabled", async () => {
      const toggled = { ...mockMemory, isEnabled: false };
      memoryRepo.findById.mockResolvedValue(mockMemory);
      memoryRepo.update.mockResolvedValue(toggled);

      const result = await service.toggleMemory("mem-1", "user-1");

      expect(result.isEnabled).toBe(false);
      expect(memoryRepo.update).toHaveBeenCalledWith("mem-1", { isEnabled: false });
    });

    it("should toggle disabled memory to enabled", async () => {
      const disabledMemory = { ...mockMemory, isEnabled: false };
      const toggled = { ...mockMemory, isEnabled: true };
      memoryRepo.findById.mockResolvedValue(disabledMemory);
      memoryRepo.update.mockResolvedValue(toggled);

      const result = await service.toggleMemory("mem-1", "user-1");

      expect(result.isEnabled).toBe(true);
      expect(memoryRepo.update).toHaveBeenCalledWith("mem-1", { isEnabled: true });
    });

    it("should throw EntityNotFoundException when not found", async () => {
      memoryRepo.findById.mockResolvedValue(null);

      await expect(service.toggleMemory("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe("onModuleInit", () => {
    it("should subscribe to message.completed event", async () => {
      await service.onModuleInit();

      expect(rabbitMQ.subscribe).toHaveBeenCalledWith(
        EventPattern.MESSAGE_COMPLETED,
        expect.any(Function),
      );
    });
  });
});
