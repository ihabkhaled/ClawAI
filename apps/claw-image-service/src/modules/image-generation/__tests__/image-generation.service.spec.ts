jest.mock('../managers/image-execution.manager');

import { ImageGenerationService } from '../services/image-generation.service';
import { type ImageGenerationRepository } from '../repositories/image-generation.repository';
import { type ImageExecutionManager } from '../managers/image-execution.manager';
import { type RabbitMQService } from '@claw/shared-rabbitmq';

const mockRecord = {
  id: 'img-1',
  userId: 'user-1',
  threadId: null,
  messageId: null,
  prompt: 'a cute cat',
  revisedPrompt: null,
  provider: 'IMAGE_OPENAI',
  model: 'dall-e-3',
  width: 1024,
  height: 1024,
  quality: null,
  style: null,
  fileId: null,
  status: 'PENDING',
  errorMessage: null,
  latencyMs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = (): Partial<Record<keyof ImageGenerationRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue(mockRecord),
  findById: jest.fn().mockResolvedValue({ ...mockRecord, fileId: 'file-1', status: 'COMPLETED' }),
  findByUserId: jest.fn().mockResolvedValue([mockRecord]),
  countByUserId: jest.fn().mockResolvedValue(1),
  updateStatus: jest.fn().mockResolvedValue(mockRecord),
});

const mockExecManager = (): Partial<Record<keyof ImageExecutionManager, jest.Mock>> => ({
  execute: jest.fn().mockResolvedValue({
    fileId: 'file-1',
    revisedPrompt: 'A photorealistic cute tabby cat',
    latencyMs: 3500,
  }),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;
  let repo: ReturnType<typeof mockRepo>;
  let execManager: ReturnType<typeof mockExecManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    repo = mockRepo();
    execManager = mockExecManager();
    rabbitMQ = mockRabbitMQ();
    service = new ImageGenerationService(
      repo as unknown as ImageGenerationRepository,
      execManager as unknown as ImageExecutionManager,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('generate', () => {
    it('should create record, execute, update status, and publish event', async () => {
      const result = await service.generate({
        prompt: 'a cute cat',
        provider: 'IMAGE_OPENAI',
        model: 'dall-e-3',
        userId: 'user-1',
      });

      expect(result.fileId).toBe('file-1');
      expect(result.latencyMs).toBe(3500);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.updateStatus).toHaveBeenCalledTimes(2);
      expect(execManager.execute).toHaveBeenCalled();
      expect(rabbitMQ.publish).toHaveBeenCalledWith('image.generated', expect.any(Object));
    });
  });

  describe('getById', () => {
    it('should return record when owned by user', async () => {
      const result = await service.getById('img-1', 'user-1');
      expect(result.id).toBe('img-1');
    });

    it('should throw when not found', async () => {
      repo.findById?.mockResolvedValue(null);
      await expect(service.getById('missing', 'user-1')).rejects.toThrow();
    });

    it('should throw when owned by different user', async () => {
      await expect(service.getById('img-1', 'other-user')).rejects.toThrow();
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
