import { PipelineManager } from '../managers/pipeline.manager';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../services/chat-stream.service';
import { pipelineMessageSchema } from '../dto/pipeline-message.dto';

jest.mock('../../../common/utilities/http-client.utility');
jest.mock('../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../common/utilities/http-client.utility') as {
  httpRequest: jest.Mock;
};

const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

AppConfig.get.mockReturnValue({ OLLAMA_SERVICE_URL: 'http://ollama:4008' });

const mockMessagesRepo = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  create: jest.fn(),
});

const mockThreadsRepo = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  create: jest.fn(),
  findById: jest.fn(),
});

const mockStreamService = (): Partial<Record<keyof ChatStreamService, jest.Mock>> => ({
  emitCompletion: jest.fn(),
  emitError: jest.fn(),
});

const makeOllamaSuccess = (text: string) =>
  Promise.resolve({ ok: true, status: 200, data: { response: text } });

describe('PipelineManager', () => {
  let manager: PipelineManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepo>;
  let threadsRepo: ReturnType<typeof mockThreadsRepo>;
  let streamService: ReturnType<typeof mockStreamService>;

  beforeEach(() => {
    jest.clearAllMocks();
    messagesRepo = mockMessagesRepo();
    threadsRepo = mockThreadsRepo();
    streamService = mockStreamService();
    manager = new PipelineManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
    );
  });

  describe('executePipeline', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-1', threadId: 'thread-1' });

      const result = await manager.executePipeline('user-1', {
        content: 'A request that is long enough',
        threadId: 'thread-1',
        template: 'analyze-reason-format',
      });

      expect(result).toEqual({ messageId: 'msg-1', threadId: 'thread-1' });
    });

    it('should create a new thread when no threadId is provided', async () => {
      threadsRepo.create!.mockResolvedValue({ id: 'new-thread', userId: 'user-1' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-2', threadId: 'new-thread' });

      const result = await manager.executePipeline('user-1', {
        content: 'A request that is long enough',
        template: 'analyze-reason-format',
      });

      expect(threadsRepo.create).toHaveBeenCalled();
      expect(result.threadId).toBe('new-thread');
    });

    it('should resolve immediately (fire-and-forget)', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-3', threadId: 'thread-1' });

      const promise = manager.executePipeline('user-1', {
        content: 'A request that is long enough',
        threadId: 'thread-1',
        template: 'analyze-reason-format',
      });

      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with pipeline: true in metadata', async () => {
      httpRequest
        .mockResolvedValueOnce(makeOllamaSuccess('Analysis output'))
        .mockResolvedValueOnce(makeOllamaSuccess('Reasoning output'))
        .mockResolvedValueOnce(makeOllamaSuccess('Formatted output'));

      messagesRepo.create!.mockResolvedValue({ id: 'assist-1', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'My request content', {
        content: 'My request content',
        template: 'analyze-reason-format',
      });

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect((assistantCall![0] as { metadata?: { pipeline?: boolean } }).metadata?.pipeline).toBe(
        true,
      );
    });

    it('should store metadata with correct stageCount', async () => {
      httpRequest
        .mockResolvedValueOnce(makeOllamaSuccess('Stage 1 output'))
        .mockResolvedValueOnce(makeOllamaSuccess('Stage 2 output'))
        .mockResolvedValueOnce(makeOllamaSuccess('Stage 3 output'));

      messagesRepo.create!.mockResolvedValue({ id: 'assist-2', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'My request content', {
        content: 'My request content',
        template: 'analyze-reason-format',
      });

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(
        (assistantCall![0] as { metadata?: { stageCount?: number } }).metadata?.stageCount,
      ).toBe(3);
    });

    it('should emit SSE completion on success', async () => {
      httpRequest
        .mockResolvedValueOnce(makeOllamaSuccess('Analysis'))
        .mockResolvedValueOnce(makeOllamaSuccess('Reasoning'))
        .mockResolvedValueOnce(makeOllamaSuccess('Formatted'));

      messagesRepo.create!.mockResolvedValue({ id: 'msg-done', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'My request content', {
        content: 'My request content',
        template: 'analyze-reason-format',
      });

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-1',
        'local-ollama',
        'gemma3:4b',
      );
    });

    it('should emit SSE error and store error message when Ollama fails', async () => {
      httpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: { response: '' } });
      messagesRepo.create!.mockResolvedValue({ id: 'err-msg', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'My request content', {
        content: 'My request content',
        template: 'analyze-reason-format',
      });

      expect(streamService.emitError).toHaveBeenCalledWith('thread-1', expect.any(String));
      const errorCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { metadata?: { error?: boolean } }).metadata?.error === true,
      );
      expect(errorCall).toBeDefined();
    });

    it('should resolve even when everything fails (fire-and-forget safety)', async () => {
      httpRequest.mockRejectedValueOnce(new Error('Network error'));
      messagesRepo.create!.mockRejectedValue(new Error('DB error'));

      await expect(
        manager.executeInBackground('thread-1', 'My request content', {
          content: 'My request content',
          template: 'analyze-reason-format',
        }),
      ).resolves.toBeUndefined();
    });

    it('should use analyze-reason-format template stages by default', async () => {
      httpRequest
        .mockResolvedValueOnce(makeOllamaSuccess('Analysis'))
        .mockResolvedValueOnce(makeOllamaSuccess('Reasoning'))
        .mockResolvedValueOnce(makeOllamaSuccess('Formatted'));

      messagesRepo.create!.mockResolvedValue({ id: 'msg-tmpl', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Content here', {
        content: 'Content here',
        template: 'analyze-reason-format',
      });

      expect(httpRequest).toHaveBeenCalledTimes(3);
    });

    it('should use customStages when template is custom', async () => {
      httpRequest
        .mockResolvedValueOnce(makeOllamaSuccess('Custom stage 1 output'))
        .mockResolvedValueOnce(makeOllamaSuccess('Custom stage 2 output'));

      messagesRepo.create!.mockResolvedValue({ id: 'msg-custom', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Content', {
        content: 'Content',
        template: 'custom',
        customStages: [
          { name: 'Stage A', instruction: 'Do A:', model: 'gemma3:4b' },
          { name: 'Stage B', instruction: 'Do B:', model: 'gemma3:4b' },
        ],
      });

      expect(httpRequest).toHaveBeenCalledTimes(2);
      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(
        (assistantCall![0] as { metadata?: { stageCount?: number } }).metadata?.stageCount,
      ).toBe(2);
    });
  });

  describe('DTO validation', () => {
    it('should accept valid input', () => {
      const result = pipelineMessageSchema.safeParse({
        content: 'A request that is long enough',
        threadId: 'thread-abc',
        template: 'analyze-reason-format',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = pipelineMessageSchema.safeParse({
        content: '',
        template: 'analyze-reason-format',
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 5 custom stages', () => {
      const result = pipelineMessageSchema.safeParse({
        content: 'A request content here',
        template: 'custom',
        customStages: [
          { name: 'S1', instruction: 'Do 1:', model: 'gemma3:4b' },
          { name: 'S2', instruction: 'Do 2:', model: 'gemma3:4b' },
          { name: 'S3', instruction: 'Do 3:', model: 'gemma3:4b' },
          { name: 'S4', instruction: 'Do 4:', model: 'gemma3:4b' },
          { name: 'S5', instruction: 'Do 5:', model: 'gemma3:4b' },
          { name: 'S6', instruction: 'Do 6:', model: 'gemma3:4b' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid template value', () => {
      const result = pipelineMessageSchema.safeParse({
        content: 'A request content here',
        template: 'invalid-template',
      });
      expect(result.success).toBe(false);
    });

    it('should apply default template of analyze-reason-format when not provided', () => {
      const result = pipelineMessageSchema.safeParse({
        content: 'A request content here',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.template).toBe('analyze-reason-format');
      }
    });
  });
});
