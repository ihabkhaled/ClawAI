import { ContextPacksService } from "../services/context-packs.service";
import { type ContextPacksRepository } from "../repositories/context-packs.repository";
import { type RabbitMQService } from "@claw/shared-rabbitmq";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";

const mockPack = {
  id: "pack-1",
  userId: "user-1",
  name: "My Context Pack",
  description: "A test context pack",
  scope: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPackWithItems = {
  ...mockPack,
  items: [
    {
      id: "item-1",
      contextPackId: "pack-1",
      type: "text",
      content: "Some context",
      fileId: null,
      sortOrder: 0,
      createdAt: new Date(),
    },
  ],
};

const mockItem = {
  id: "item-1",
  contextPackId: "pack-1",
  type: "text",
  content: "Some context",
  fileId: null,
  sortOrder: 0,
  createdAt: new Date(),
};

const mockContextPacksRepository = (): Record<keyof ContextPacksRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  reorderItems: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe("ContextPacksService", () => {
  let service: ContextPacksService;
  let packsRepo: ReturnType<typeof mockContextPacksRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    packsRepo = mockContextPacksRepository();
    rabbitMQ = mockRabbitMQ();
    service = new ContextPacksService(
      packsRepo as unknown as ContextPacksRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("createContextPack", () => {
    it("should create a context pack and publish event", async () => {
      packsRepo.create.mockResolvedValue(mockPack);

      const result = await service.createContextPack("user-1", {
        name: "My Context Pack",
        description: "A test context pack",
      });

      expect(result).toEqual(mockPack);
      expect(packsRepo.create).toHaveBeenCalledWith({
        userId: "user-1",
        name: "My Context Pack",
        description: "A test context pack",
        scope: undefined,
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "context_pack.updated",
        expect.objectContaining({
          contextPackId: "pack-1",
          action: "created",
        }),
      );
    });
  });

  describe("getContextPacks", () => {
    it("should return paginated context packs", async () => {
      packsRepo.findAll.mockResolvedValue([mockPack]);
      packsRepo.countAll.mockResolvedValue(1);

      const result = await service.getContextPacks("user-1", 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should pass search filter to repository", async () => {
      packsRepo.findAll.mockResolvedValue([]);
      packsRepo.countAll.mockResolvedValue(0);

      await service.getContextPacks("user-1", 1, 20, "test");

      expect(packsRepo.findAll).toHaveBeenCalledWith(
        { userId: "user-1", search: "test" },
        1,
        20,
      );
    });
  });

  describe("getContextPack", () => {
    it("should return context pack with items when found", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);

      const result = await service.getContextPack("pack-1", "user-1");

      expect(result).toEqual(mockPackWithItems);
      expect(result.items).toHaveLength(1);
    });

    it("should throw EntityNotFoundException when not found", async () => {
      packsRepo.findById.mockResolvedValue(null);

      await expect(service.getContextPack("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it("should throw BusinessException when user does not own pack", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);

      await expect(service.getContextPack("pack-1", "other-user")).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("updateContextPack", () => {
    it("should update context pack and publish event", async () => {
      const updated = { ...mockPack, name: "Updated Pack" };
      packsRepo.findById.mockResolvedValue(mockPackWithItems);
      packsRepo.update.mockResolvedValue(updated);

      const result = await service.updateContextPack("pack-1", "user-1", {
        name: "Updated Pack",
      });

      expect(result.name).toBe("Updated Pack");
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "context_pack.updated",
        expect.objectContaining({
          contextPackId: "pack-1",
          action: "updated",
        }),
      );
    });

    it("should throw EntityNotFoundException when not found", async () => {
      packsRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateContextPack("nonexistent", "user-1", { name: "New" }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe("deleteContextPack", () => {
    it("should delete context pack and publish event", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);
      packsRepo.delete.mockResolvedValue(mockPack);

      const result = await service.deleteContextPack("pack-1", "user-1");

      expect(result).toEqual(mockPack);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "context_pack.updated",
        expect.objectContaining({
          contextPackId: "pack-1",
          action: "deleted",
        }),
      );
    });

    it("should throw EntityNotFoundException when not found", async () => {
      packsRepo.findById.mockResolvedValue(null);

      await expect(service.deleteContextPack("nonexistent", "user-1")).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe("addItem", () => {
    it("should add item to context pack and publish event", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);
      packsRepo.addItem.mockResolvedValue(mockItem);

      const result = await service.addItem("pack-1", "user-1", {
        type: "text",
        content: "Some context",
      });

      expect(result).toEqual(mockItem);
      expect(packsRepo.addItem).toHaveBeenCalledWith({
        contextPackId: "pack-1",
        type: "text",
        content: "Some context",
        fileId: undefined,
        sortOrder: undefined,
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "context_pack.updated",
        expect.objectContaining({
          contextPackId: "pack-1",
          action: "item_added",
        }),
      );
    });

    it("should throw EntityNotFoundException when pack not found", async () => {
      packsRepo.findById.mockResolvedValue(null);

      await expect(
        service.addItem("nonexistent", "user-1", { type: "text", content: "test" }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it("should throw BusinessException when user does not own pack", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);

      await expect(
        service.addItem("pack-1", "other-user", { type: "text", content: "test" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("removeItem", () => {
    it("should remove item from context pack and publish event", async () => {
      packsRepo.findById.mockResolvedValue(mockPackWithItems);
      packsRepo.removeItem.mockResolvedValue(mockItem);

      const result = await service.removeItem("pack-1", "item-1", "user-1");

      expect(result).toEqual(mockItem);
      expect(packsRepo.removeItem).toHaveBeenCalledWith("item-1");
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        "context_pack.updated",
        expect.objectContaining({
          contextPackId: "pack-1",
          action: "item_removed",
        }),
      );
    });

    it("should throw EntityNotFoundException when pack not found", async () => {
      packsRepo.findById.mockResolvedValue(null);

      await expect(
        service.removeItem("nonexistent", "item-1", "user-1"),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
