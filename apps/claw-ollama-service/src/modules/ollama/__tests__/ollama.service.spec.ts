import { OllamaService } from '../ollama.service';
import { type LocalModelsRepository } from '../repositories/local-models.repository';
import { type RuntimeConfigsRepository } from '../repositories/runtime-configs.repository';
import { type ModelCatalogRepository } from '../repositories/model-catalog.repository';
import { type PullJobsRepository } from '../repositories/pull-jobs.repository';
import { type OllamaManager } from '../managers/ollama.manager';
import { type CatalogRemoteMetadataService } from '../services/catalog-remote-metadata.service';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EntityNotFoundException } from '../../../common/errors';
import {
  DownloadStatus,
  LocalModelRole,
  ModelCategory,
  RuntimeType,
} from '../../../generated/prisma';

jest.mock('../managers/adapters/runtime-adapter-factory', () => ({
  getRuntimeAdapter: jest.fn(),
}));

const mockLocalModel = {
  id: 'model-1',
  name: 'llama3',
  tag: 'latest',
  runtime: RuntimeType.OLLAMA,
  sizeBytes: BigInt(4000000000),
  family: 'llama',
  parameters: '8B',
  quantization: 'Q4_0',
  isInstalled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRoleAssignment = {
  id: 'role-1',
  modelId: 'model-1',
  role: LocalModelRole.LOCAL_FALLBACK_CHAT,
  isActive: true,
  createdAt: new Date(),
};

const mockCatalogEntry = {
  id: 'catalog-1',
  name: 'llama3',
  tag: 'latest',
  displayName: 'Llama 3',
  category: ModelCategory.GENERAL,
  description: 'Llama model',
  sizeBytes: null,
  parameterCount: '8B',
  quantization: null,
  runtime: RuntimeType.OLLAMA,
  ollamaName: 'llama3:latest',
  sourceUrl: 'https://registry.ollama.com/library/stale-llama3',
  downloadStatus: DownloadStatus.UNKNOWN,
  isRecommended: false,
  capabilities: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLocalModelsRepo = (): Partial<Record<keyof LocalModelsRepository, jest.Mock>> => ({
  findAll: jest.fn().mockResolvedValue([mockLocalModel]),
  countAll: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockResolvedValue(mockLocalModel),
  findAllInstalled: jest.fn().mockResolvedValue([mockLocalModel]),
});

const mockRuntimeConfigsRepo = (): Partial<Record<keyof RuntimeConfigsRepository, jest.Mock>> => ({
  findAll: jest.fn().mockResolvedValue([]),
});

const mockManager = (): Partial<Record<keyof OllamaManager, jest.Mock>> => ({
  pullModel: jest.fn().mockResolvedValue(mockLocalModel),
  assignRole: jest.fn().mockResolvedValue(mockRoleAssignment),
  generate: jest.fn().mockResolvedValue({
    model: 'llama3',
    createdAt: '2024-01-01T00:00:00Z',
    response: 'Hello!',
    done: true,
  }),
  checkRuntimeHealth: jest.fn().mockResolvedValue({
    runtime: 'OLLAMA',
    healthy: true,
    latencyMs: 50,
  }),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(void 0),
});

const mockCatalogRemoteMetadataService = (): Partial<
  Record<keyof CatalogRemoteMetadataService, jest.Mock>
> => ({
  getMetadata: jest.fn().mockResolvedValue({
    sourceUrl: 'https://registry.ollama.com/library/llama3',
    isAvailable: true,
    isDownloadable: true,
    sizeBytes: BigInt(4000000000),
    resolvedOllamaName: 'llama3:latest',
    availabilityError: null,
  }),
});

describe('OllamaService', () => {
  let service: OllamaService;
  let localModelsRepo: ReturnType<typeof mockLocalModelsRepo>;
  let runtimeConfigsRepo: ReturnType<typeof mockRuntimeConfigsRepo>;
  let modelCatalogRepo: Partial<Record<keyof ModelCatalogRepository, jest.Mock>>;
  let pullJobsRepo: Partial<Record<keyof PullJobsRepository, jest.Mock>>;
  let manager: ReturnType<typeof mockManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;
  let catalogRemoteMetadataService: ReturnType<typeof mockCatalogRemoteMetadataService>;

  const mockModelCatalogRepo = (): Partial<Record<keyof ModelCatalogRepository, jest.Mock>> => ({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    countAll: jest.fn().mockResolvedValue(0),
    search: jest.fn().mockResolvedValue([]),
    updateSourceUrlIfChanged: jest.fn().mockResolvedValue(void 0),
  });

  const mockPullJobsRepo = (): Partial<Record<keyof PullJobsRepository, jest.Mock>> => ({
    create: jest.fn().mockResolvedValue({ id: 'pull-1', status: 'PENDING' }),
    findById: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ id: 'pull-1' }),
    findRecent: jest.fn().mockResolvedValue([]),
    findLatestByModelName: jest.fn().mockResolvedValue(null),
  });

  beforeEach(() => {
    localModelsRepo = mockLocalModelsRepo();
    runtimeConfigsRepo = mockRuntimeConfigsRepo();
    modelCatalogRepo = mockModelCatalogRepo();
    pullJobsRepo = mockPullJobsRepo();
    manager = mockManager();
    rabbitMQ = mockRabbitMQ();
    catalogRemoteMetadataService = mockCatalogRemoteMetadataService();
    service = new OllamaService(
      localModelsRepo as unknown as LocalModelsRepository,
      runtimeConfigsRepo as unknown as RuntimeConfigsRepository,
      modelCatalogRepo as unknown as ModelCatalogRepository,
      pullJobsRepo as unknown as PullJobsRepository,
      manager as unknown as OllamaManager,
      rabbitMQ as unknown as RabbitMQService,
      catalogRemoteMetadataService as unknown as CatalogRemoteMetadataService,
    );
  });

  describe('getModels', () => {
    it('should return paginated models', async () => {
      const result = await service.getModels({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should pass runtime filter to repository', async () => {
      await service.getModels({ page: 1, limit: 20, runtime: RuntimeType.OLLAMA });

      expect(localModelsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ runtime: RuntimeType.OLLAMA }),
        1,
        20,
      );
    });
  });

  describe('pullModel', () => {
    it('should delegate to manager and publish event', async () => {
      const result = await service.pullModel({
        modelName: 'llama3',
        runtime: RuntimeType.OLLAMA,
      });

      expect(result.id).toBe('model-1');
      expect(manager.pullModel).toHaveBeenCalledWith('llama3', RuntimeType.OLLAMA);
      expect(rabbitMQ.publish).toHaveBeenCalled();
    });
  });

  describe('getCatalog', () => {
    it('should sync verified source urls and match installed models by canonical registry name', async () => {
      modelCatalogRepo.findAll?.mockResolvedValue([mockCatalogEntry]);
      modelCatalogRepo.countAll?.mockResolvedValue(1);
      catalogRemoteMetadataService.getMetadata?.mockResolvedValue({
        sourceUrl: 'https://registry.ollama.com/library/llama3',
        isAvailable: true,
        isDownloadable: true,
        sizeBytes: BigInt(4000000000),
        resolvedOllamaName: 'llama3:latest',
        availabilityError: null,
      });

      const result = await service.getCatalog({ page: 1, limit: 20 });

      expect(modelCatalogRepo.updateSourceUrlIfChanged).toHaveBeenCalledWith(
        'catalog-1',
        'https://registry.ollama.com/library/llama3',
      );
      expect(result.data[0]?.sourceUrl).toBe('https://registry.ollama.com/library/llama3');
      expect(result.data[0]?.isInstalled).toBe(true);
    });

    it('should pass downloadStatus filters to the repository', async () => {
      modelCatalogRepo.findAll?.mockResolvedValue([]);
      modelCatalogRepo.countAll?.mockResolvedValue(0);

      await service.getCatalog({
        page: 1,
        limit: 20,
        runtime: RuntimeType.OLLAMA,
        downloadStatus: DownloadStatus.CLOUD_ONLY,
      });

      expect(modelCatalogRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: RuntimeType.OLLAMA,
          downloadStatus: DownloadStatus.CLOUD_ONLY,
        }),
        1,
        20,
      );
    });
  });

  describe('assignRole', () => {
    it('should validate model exists and delegate to manager', async () => {
      const result = await service.assignRole({
        modelId: 'model-1',
        role: LocalModelRole.LOCAL_FALLBACK_CHAT,
      });

      expect(result.id).toBe('role-1');
      expect(localModelsRepo.findById).toHaveBeenCalledWith('model-1');
      expect(manager.assignRole).toHaveBeenCalledWith(
        'model-1',
        LocalModelRole.LOCAL_FALLBACK_CHAT,
      );
    });

    it('should throw EntityNotFoundException when model not found', async () => {
      localModelsRepo.findById?.mockResolvedValue(null);

      await expect(
        service.assignRole({ modelId: 'nonexistent', role: LocalModelRole.ROUTER }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('generate', () => {
    it('should delegate to manager', async () => {
      const result = await service.generate({
        model: 'llama3',
        prompt: 'Hello',
      });

      expect(result.response).toBe('Hello!');
      expect(manager.generate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3', prompt: 'Hello' }),
      );
    });
  });

  describe('checkHealth', () => {
    it('should delegate to manager with runtime type', async () => {
      const result = await service.checkHealth('OLLAMA');

      expect(result.healthy).toBe(true);
      expect(manager.checkRuntimeHealth).toHaveBeenCalledWith('OLLAMA');
    });
  });
});
