import { ChatThreadsService } from "../services/chat-threads.service";
import { ChatThreadsRepository } from "../repositories/chat-threads.repository";
import { ChatMessagesRepository } from "../../chat-messages/repositories/chat-messages.repository";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EntityNotFoundException, BusinessException } from "../../../common/errors";

const mockThread = {
  id: "thread-1",
  userId: "user-1",
  title: "Test Thread",
  routingMode: "AUTO" as const,
  lastProvider: null,
  lastModel: null,
  isPinned: false,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockThreadWithCount = {
  ...mockThread,
  _count: { messages: 5 },
};

const mockThreadsRepository = (): Record<keyof ChatThreadsRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  deleteByThreadId: jest.fn().mockResolvedValue(0),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe("ChatThreadsService", () => {
  let service: ChatThreadsService;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    threadsRepo = mockThreadsRepository();
    messagesRepo = mockMessagesRepository();
    rabbitMQ = mockRabbitMQ();
    service = new ChatThreadsService(
      threadsRepo as unknown as ChatThreadsRepository,
      messagesRepo as unknown as ChatMessagesRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("createThread", () => {
    it("should create a thread and publish event", async () => {
      threadsRepo.create.mockResolvedValue(mockThread);

      const result = await service.createThread("user-1", { title: "Test Thread" });

      expect(result).toEqual(mockThread);
      expect(threadsRepo.create).toHaveBeenCalledWith({
        userId: "user-1",
        title: "Test Thread",
        routingMode: undefined,
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "thread.created",
        expect.objectContaining({
          threadId: "thread-1",
          userId: "user-1",
        }),
      );
    });
  });

  describe("getThreads", () => {
    it("should return paginated threads", async () => {
      threadsRepo.findAll.mockResolvedValue([mockThreadWithCount]);
      threadsRepo.countAll.mockResolvedValue(1);

      const result = await service.getThreads("user-1", {
        page: 1,
        limit: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should pass filters to repository", async () => {
      threadsRepo.findAll.mockResolvedValue([]);
      threadsRepo.countAll.mockResolvedValue(0);

      await service.getThreads("user-1", {
        page: 1,
        limit: 20,
        search: "test",
        isPinned: true,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });

      expect(threadsRepo.findAll).toHaveBeenCalledWith(
        { userId: "user-1", search: "test", isPinned: true, isArchived: undefined },
        1,
        20,
        "updatedAt",
        "desc",
      );
    });
  });

  describe("getThread", () => {
    it("should return thread when found and owned by user", async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      const result = await service.getThread("thread-1", "user-1");

      expect(result).toEqual(mockThread);
    });

    it("should throw EntityNotFoundException when not found", async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.getThread("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own thread", async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await expect(service.getThread("thread-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("updateThread", () => {
    it("should update thread successfully", async () => {
      const updated = { ...mockThread, title: "Updated Title" };
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue(updated);

      const result = await service.updateThread("thread-1", "user-1", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
      expect(threadsRepo.update).toHaveBeenCalledWith("thread-1", {
        title: "Updated Title",
        isPinned: undefined,
        isArchived: undefined,
        routingMode: undefined,
      });
    });

    it("should throw EntityNotFoundException when not found", async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateThread("nonexistent", "user-1", { title: "New" }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe("deleteThread", () => {
    it("should delete thread and its messages", async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.delete.mockResolvedValue(mockThread);

      const result = await service.deleteThread("thread-1", "user-1");

      expect(result).toEqual(mockThread);
      expect(messagesRepo.deleteByThreadId).toHaveBeenCalledWith("thread-1");
      expect(threadsRepo.delete).toHaveBeenCalledWith("thread-1");
    });

    it("should throw EntityNotFoundException when not found", async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.deleteThread("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own thread", async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await expect(service.deleteThread("thread-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
