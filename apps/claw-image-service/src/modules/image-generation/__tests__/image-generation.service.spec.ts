import { vi, type Mock } from 'vitest';
import { ImageGenerationService } from '../services/image-generation.service';
import { type ImageGenerationRepository } from '../repositories/image-generation.repository';
import { type ImageExecutionManager } from '../managers/image-execution.manager';
import { type ImageGenerationEventsService } from '../services/image-generation-events.service';
import { type RabbitMQService } from '@claw/shared-rabbitmq';

vi.mock('../managers/image-execution.manager');

const mockRecord = {
  id: 'img-1',
  userId: 'user-1',
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'a cute cat',
  revisedPrompt: null,
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  status: 'QUEUED',
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  latencyMs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assets: [],
};

const mockRepo = (): Partial<Record<keyof ImageGenerationRepository, Mock>> => ({
  create: vi.fn().mockResolvedValue(mockRecord),
  findById: vi.fn().mockResolvedValue({ ...mockRecord, status: 'COMPLETED', assets: [] }),
  findByUserId: vi.fn().mockResolvedValue([mockRecord]),
  countByUserId: vi.fn().mockResolvedValue(1),
  updateStatus: vi.fn().mockResolvedValue(mockRecord),
  createEvent: vi.fn().mockResolvedValue(void 0),
  createAsset: vi.fn().mockResolvedValue({
    id: 'asset-1',
    url: '/api/v1/files/download/file-1',
    downloadUrl: '/api/v1/files/download/file-1',
    mimeType: 'image/png',
    width: null,
    height: null,
    sizeBytes: null,
  }),
});

const mockExecManager = (): Partial<Record<keyof ImageExecutionManager, Mock>> => ({
  execute: vi.fn().mockResolvedValue({
    fileId: 'file-1',
    revisedPrompt: 'A photorealistic cute tabby cat',
    latencyMs: 3500,
  }),
});

const mockEventsService = (): Partial<Record<keyof ImageGenerationEventsService, Mock>> => ({
  publish: vi.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, Mock>> => ({
  publish: vi.fn().mockResolvedValue(void 0),
});

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;
  let repo: ReturnType<typeof mockRepo>;
  let eventsService: ReturnType<typeof mockEventsService>;

  beforeEach(() => {
    repo = mockRepo();
    const execManager = mockExecManager();
    eventsService = mockEventsService();
    const rabbitMQ = mockRabbitMQ();
    service = new ImageGenerationService(
      repo as unknown as ImageGenerationRepository,
      execManager as unknown as ImageExecutionManager,
      eventsService as unknown as ImageGenerationEventsService,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('enqueueGeneration', () => {
    it('should create record, publish QUEUED event, and return immediately', async () => {
      const result = await service.enqueueGeneration({
        prompt: 'a cute cat',
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
        userId: 'user-1',
      });

      expect(result.id).toBe('img-1');
      expect(result.status).toBe('QUEUED');
      expect(repo.create).toHaveBeenCalled();
      expect(repo.createEvent).toHaveBeenCalledWith(expect.objectContaining({ status: 'QUEUED' }));
      expect(eventsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUEUED', generationId: 'img-1' }),
      );
    });
  });

  describe('getById', () => {
    it('should return record when found', async () => {
      const result = await service.getById('img-1');
      expect(result.id).toBe('img-1');
    });

    it('should throw when not found', async () => {
      repo.findById?.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow();
    });
  });

  describe('getByIdForUser', () => {
    it('should throw when owned by different user', async () => {
      await expect(service.getByIdForUser('img-1', 'other-user')).rejects.toThrow();
    });
  });

  describe('listByUser', () => {
    it('should return paginated results', async () => {
      const result = await service.listByUser('user-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
