import { OllamaManager } from "../managers/ollama.manager";
import { type LocalModelsRepository } from "../repositories/local-models.repository";
import { type RoleAssignmentsRepository } from "../repositories/role-assignments.repository";
import { type PullJobsRepository } from "../repositories/pull-jobs.repository";
import { type RuntimeConfigsRepository } from "../repositories/runtime-configs.repository";
import { LocalModelRole, PullJobStatus, RuntimeType } from "../../../generated/prisma";

jest.mock("../../../app/config/app.config", () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      OLLAMA_BASE_URL: "http://localhost:11434",
    }),
  },
}));

jest.mock("../../../common/utilities", () => ({
  createHttpClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
  }),
  httpGet: jest.fn(),
  httpPost: jest.fn(),
  verifyAccessToken: jest.fn(),
}));

jest.mock("../managers/adapters/runtime-adapter-factory", () => ({
  getRuntimeAdapter: jest.fn().mockReturnValue({
    listModels: jest.fn().mockResolvedValue([
      { name: "llama3", tag: "latest", sizeBytes: BigInt(4000000000), family: "llama", parameters: "8B", quantization: "Q4_0" },
    ]),
    pullModel: jest.fn().mockResolvedValue({ status: "success" }),
    healthCheck: jest.fn().mockResolvedValue({ runtime: "OLLAMA", healthy: true, latencyMs: 50 }),
    generate: jest.fn().mockResolvedValue({
      model: "llama3",
      createdAt: "2024-01-01T00:00:00Z",
      response: "Hello!",
      done: true,
    }),
  }),
}));

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
  findByRuntime: jest.fn().mockResolvedValue([mockLocalModel]),
  upsertByNameTagRuntime: jest.fn().mockResolvedValue(mockLocalModel),
  findById: jest.fn().mockResolvedValue(mockLocalModel),
  countAll: jest.fn().mockResolvedValue(1),
});

const mockRoleAssignmentsRepo = (): Partial<Record<keyof RoleAssignmentsRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue(mockRoleAssignment),
  findActiveByRole: jest.fn().mockResolvedValue(mockRoleAssignment),
  deactivateByRole: jest.fn().mockResolvedValue(undefined),
});

const mockPullJobsRepo = (): Partial<Record<keyof PullJobsRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue({ id: "job-1", status: PullJobStatus.IN_PROGRESS }),
  update: jest.fn().mockResolvedValue({ id: "job-1", status: PullJobStatus.COMPLETED }),
});

const mockRuntimeConfigsRepo = (): Partial<Record<keyof RuntimeConfigsRepository, jest.Mock>> => ({
  findAll: jest.fn().mockResolvedValue([]),
  findByRuntime: jest.fn().mockResolvedValue(null),
});

describe("OllamaManager", () => {
  let manager: OllamaManager;
  let localModelsRepo: ReturnType<typeof mockLocalModelsRepo>;
  let roleAssignmentsRepo: ReturnType<typeof mockRoleAssignmentsRepo>;
  let pullJobsRepo: ReturnType<typeof mockPullJobsRepo>;
  let runtimeConfigsRepo: ReturnType<typeof mockRuntimeConfigsRepo>;

  beforeEach(() => {
    localModelsRepo = mockLocalModelsRepo();
    roleAssignmentsRepo = mockRoleAssignmentsRepo();
    pullJobsRepo = mockPullJobsRepo();
    runtimeConfigsRepo = mockRuntimeConfigsRepo();
    manager = new OllamaManager(
      localModelsRepo as unknown as LocalModelsRepository,
      roleAssignmentsRepo as unknown as RoleAssignmentsRepository,
      pullJobsRepo as unknown as PullJobsRepository,
      runtimeConfigsRepo as unknown as RuntimeConfigsRepository,
    );
  });

  describe("listInstalledModels", () => {
    it("should return all installed models when no runtime specified", async () => {
      const result = await manager.listInstalledModels();

      expect(result).toEqual([mockLocalModel]);
      expect(localModelsRepo.findAll).toHaveBeenCalledWith({ isInstalled: true }, 1, 1000);
    });

    it("should filter models by runtime when specified", async () => {
      const result = await manager.listInstalledModels(RuntimeType.OLLAMA);

      expect(result).toEqual([mockLocalModel]);
      expect(localModelsRepo.findByRuntime).toHaveBeenCalledWith(RuntimeType.OLLAMA);
    });
  });

  describe("pullModel", () => {
    it("should create pull job and pull model from runtime", async () => {
      const result = await manager.pullModel("llama3", RuntimeType.OLLAMA);

      expect(result.id).toBe("model-1");
      expect(pullJobsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName: "llama3",
          runtime: RuntimeType.OLLAMA,
          status: PullJobStatus.IN_PROGRESS,
        }),
      );
    });

    it("should update pull job to COMPLETED on success", async () => {
      await manager.pullModel("llama3", RuntimeType.OLLAMA);

      expect(pullJobsRepo.update).toHaveBeenCalledWith(
        "job-1",
        expect.objectContaining({
          status: PullJobStatus.COMPLETED,
          progress: 100,
        }),
      );
    });

    it("should upsert local model record after successful pull", async () => {
      await manager.pullModel("llama3", RuntimeType.OLLAMA);

      expect(localModelsRepo.upsertByNameTagRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "llama3",
          tag: "latest",
          runtime: RuntimeType.OLLAMA,
        }),
      );
    });
  });

  describe("assignRole", () => {
    it("should deactivate previous role holder before assigning", async () => {
      await manager.assignRole("model-1", LocalModelRole.LOCAL_FALLBACK_CHAT);

      expect(roleAssignmentsRepo.deactivateByRole).toHaveBeenCalledWith(
        LocalModelRole.LOCAL_FALLBACK_CHAT,
      );
      expect(roleAssignmentsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: "model-1",
          role: LocalModelRole.LOCAL_FALLBACK_CHAT,
          isActive: true,
        }),
      );
    });

    it("should return the new role assignment", async () => {
      const result = await manager.assignRole("model-1", LocalModelRole.ROUTER);

      expect(result.id).toBe("role-1");
      expect(result.isActive).toBe(true);
    });
  });

  describe("getModelForRole", () => {
    it("should return active role assignment", async () => {
      const result = await manager.getModelForRole(LocalModelRole.LOCAL_FALLBACK_CHAT);

      expect(result).toEqual(mockRoleAssignment);
      expect(roleAssignmentsRepo.findActiveByRole).toHaveBeenCalledWith(
        LocalModelRole.LOCAL_FALLBACK_CHAT,
      );
    });

    it("should return null when no active assignment", async () => {
      roleAssignmentsRepo.findActiveByRole?.mockResolvedValue(null);

      const result = await manager.getModelForRole(LocalModelRole.ROUTER);

      expect(result).toBeNull();
    });
  });

  describe("checkRuntimeHealth", () => {
    it("should return health status from adapter", async () => {
      const result = await manager.checkRuntimeHealth(RuntimeType.OLLAMA);

      expect(result.healthy).toBe(true);
      expect(result.runtime).toBe("OLLAMA");
      expect(typeof result.latencyMs).toBe("number");
    });
  });

  describe("generate", () => {
    it("should call adapter generate and return response", async () => {
      const result = await manager.generate({
        model: "llama3",
        prompt: "Hello",
      });

      expect(result.model).toBe("llama3");
      expect(result.response).toBe("Hello!");
      expect(result.done).toBe(true);
    });
  });
});
