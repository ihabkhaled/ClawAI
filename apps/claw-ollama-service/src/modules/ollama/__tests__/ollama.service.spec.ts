import { OllamaService } from "../ollama.service";
import { LocalModelsRepository } from "../repositories/local-models.repository";
import { RuntimeConfigsRepository } from "../repositories/runtime-configs.repository";
import { OllamaManager } from "../managers/ollama.manager";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EntityNotFoundException } from "../../../common/errors";
import { RuntimeType, LocalModelRole } from "../../../generated/prisma";

const mockLocalModel = {
  id: "model-1",
  name: "llama3",
  tag: "latest",
  runtime: RuntimeType.OLLAMA,
  sizeBytes: BigInt(4000000000),
  family: "llama",
  parameters: "8B",
  quantization: "Q4_0",
  isInstalled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRoleAssignment = {
  id: "role-1",
  modelId: "model-1",
  role: LocalModelRole.LOCAL_FALLBACK_CHAT,
  isActive: true,
  createdAt: new Date(),
};

const mockLocalModelsRepo = (): Partial<Record<keyof LocalModelsRepository, jest.Mock>> => ({
  findAll: jest.fn().mockResolvedValue([mockLocalModel]),
  countAll: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockResolvedValue(mockLocalModel),
});

const mockRuntimeConfigsRepo = (): Partial<Record<keyof RuntimeConfigsRepository, jest.Mock>> => ({
  findAll: jest.fn().mockResolvedValue([]),
});

const mockManager = (): Partial<Record<keyof OllamaManager, jest.Mock>> => ({
  pullModel: jest.fn().mockResolvedValue(mockLocalModel),
  assignRole: jest.fn().mockResolvedValue(mockRoleAssignment),
  generate: jest.fn().mockResolvedValue({
    model: "llama3",
    createdAt: "2024-01-01T00:00:00Z",
    response: "Hello!",
    done: true,
  }),
  checkRuntimeHealth: jest.fn().mockResolvedValue({
    runtime: "OLLAMA",
    healthy: true,
    latencyMs: 50,
  }),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe("OllamaService", () => {
  let service: OllamaService;
  let localModelsRepo: ReturnType<typeof mockLocalModelsRepo>;
  let runtimeConfigsRepo: ReturnType<typeof mockRuntimeConfigsRepo>;
  let manager: ReturnType<typeof mockManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    localModelsRepo = mockLocalModelsRepo();
    runtimeConfigsRepo = mockRuntimeConfigsRepo();
    manager = mockManager();
    rabbitMQ = mockRabbitMQ();
    service = new OllamaService(
      localModelsRepo as unknown as LocalModelsRepository,
      runtimeConfigsRepo as unknown as RuntimeConfigsRepository,
      manager as unknown as OllamaManager,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe("getModels", () => {
    it("should return paginated models", async () => {
      const result = await service.getModels({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it("should pass runtime filter to repository", async () => {
      await service.getModels({ page: 1, limit: 20, runtime: RuntimeType.OLLAMA });

      expect(localModelsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ runtime: RuntimeType.OLLAMA }),
        1,
        20,
      );
    });
  });

  describe("pullModel", () => {
    it("should delegate to manager and publish event", async () => {
      const result = await service.pullModel({
        modelName: "llama3",
        runtime: RuntimeType.OLLAMA,
      });

      expect(result.id).toBe("model-1");
      expect(manager.pullModel).toHaveBeenCalledWith("llama3", RuntimeType.OLLAMA);
      expect(rabbitMQ.publish).toHaveBeenCalled();
    });
  });

  describe("assignRole", () => {
    it("should validate model exists and delegate to manager", async () => {
      const result = await service.assignRole({
        modelId: "model-1",
        role: LocalModelRole.LOCAL_FALLBACK_CHAT,
      });

      expect(result.id).toBe("role-1");
      expect(localModelsRepo.findById).toHaveBeenCalledWith("model-1");
      expect(manager.assignRole).toHaveBeenCalledWith("model-1", LocalModelRole.LOCAL_FALLBACK_CHAT);
    });

    it("should throw EntityNotFoundException when model not found", async () => {
      localModelsRepo.findById?.mockResolvedValue(null);

      await expect(
        service.assignRole({ modelId: "nonexistent", role: LocalModelRole.ROUTER }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe("generate", () => {
    it("should delegate to manager", async () => {
      const result = await service.generate({
        model: "llama3",
        prompt: "Hello",
      });

      expect(result.response).toBe("Hello!");
      expect(manager.generate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "llama3", prompt: "Hello" }),
      );
    });
  });

  describe("checkHealth", () => {
    it("should delegate to manager with runtime type", async () => {
      const result = await service.checkHealth("OLLAMA");

      expect(result.healthy).toBe(true);
      expect(manager.checkRuntimeHealth).toHaveBeenCalledWith("OLLAMA");
    });
  });
});
