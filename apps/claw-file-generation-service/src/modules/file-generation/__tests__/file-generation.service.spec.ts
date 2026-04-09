import { FileGenerationService } from '../services/file-generation.service';
import { type FileGenerationRepository } from '../repositories/file-generation.repository';
import { type FileExecutionManager } from '../managers/file-execution.manager';
import { type FileGenerationEventsService } from '../services/file-generation-events.service';
import { type RabbitMQService } from '@claw/shared-rabbitmq';

jest.mock('../managers/file-execution.manager');

const mockRecord = {
  id: 'fg-1',
  userId: 'user-1',
  threadId: null,
  userMessageId: null,
  assistantMessageId: null,
  prompt: 'generate a text file',
  content: 'Hello world',
  format: 'TXT',
  filename: 'generated-123.txt',
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
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

const mockRepo = (): Partial<Record<keyof FileGenerationRepository, jest.Mock>> => ({
  create: jest.fn().mockResolvedValue(mockRecord),
  findById: jest.fn().mockResolvedValue({ ...mockRecord, status: 'COMPLETED', assets: [] }),
  findByUserId: jest.fn().mockResolvedValue([mockRecord]),
  countByUserId: jest.fn().mockResolvedValue(1),
  updateStatus: jest.fn().mockResolvedValue(mockRecord),
  createEvent: jest.fn().mockResolvedValue(void 0),
  createAsset: jest.fn().mockResolvedValue({
    id: 'asset-1',
    url: '/api/v1/files/download/file-1',
    downloadUrl: '/api/v1/files/download/file-1',
    mimeType: 'text/plain',
    sizeBytes: 11,
  }),
});

const mockExecManager = (): Partial<Record<keyof FileExecutionManager, jest.Mock>> => ({
  convert: jest.fn().mockResolvedValue(Buffer.from('Hello world')),
  storeFile: jest.fn().mockResolvedValue('file-1'),
  generateFilename: jest.fn().mockReturnValue('generated-123.txt'),
});

const mockEventsService = (): Partial<Record<keyof FileGenerationEventsService, jest.Mock>> => ({
  publish: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(void 0),
});

describe('FileGenerationService', () => {
  let service: FileGenerationService;
  let repo: ReturnType<typeof mockRepo>;
  let eventsService: ReturnType<typeof mockEventsService>;

  beforeEach(() => {
    repo = mockRepo();
    const execManager = mockExecManager();
    eventsService = mockEventsService();
    const rabbitMQ = mockRabbitMQ();
    service = new FileGenerationService(
      repo as unknown as FileGenerationRepository,
      execManager as unknown as FileExecutionManager,
      eventsService as unknown as FileGenerationEventsService,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('enqueueGeneration', () => {
    it('should create record and publish QUEUED event', async () => {
      const result = await service.enqueueGeneration({
        prompt: 'generate a text file',
        content: 'Hello world',
        format: 'TXT',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        userId: 'user-1',
      });

      expect(result.id).toBe('fg-1');
      expect(result.status).toBe('QUEUED');
      expect(repo.create).toHaveBeenCalled();
      expect(repo.createEvent).toHaveBeenCalledWith(expect.objectContaining({ status: 'QUEUED' }));
      expect(eventsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUEUED', generationId: 'fg-1' }),
      );
    });
  });

  describe('getById', () => {
    it('should return record when found', async () => {
      const result = await service.getById('fg-1');
      expect(result.id).toBe('fg-1');
    });

    it('should throw when not found', async () => {
      repo.findById?.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow();
    });
  });

  describe('getByIdForUser', () => {
    it('should throw when owned by different user', async () => {
      await expect(service.getByIdForUser('fg-1', 'other-user')).rejects.toThrow();
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
