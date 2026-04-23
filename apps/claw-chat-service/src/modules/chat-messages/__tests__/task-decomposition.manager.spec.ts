import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { decomposeTaskSchema } from '../dto/decompose-task.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';

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
  emitRequestAccepted: jest.fn(),
  emitProgressStage: jest.fn(),
  emitCompletion: jest.fn(),
  emitError: jest.fn(),
});

const makeOllamaSuccess = (text: string) =>
  Promise.resolve({ ok: true, status: 200, data: { response: text } });

describe('TaskDecompositionManager', () => {
  let manager: TaskDecompositionManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepo>;
  let threadsRepo: ReturnType<typeof mockThreadsRepo>;
  let streamService: ReturnType<typeof mockStreamService>;

  beforeEach(() => {
    jest.clearAllMocks();
    messagesRepo = mockMessagesRepo();
    threadsRepo = mockThreadsRepo();
    streamService = mockStreamService();
    manager = new TaskDecompositionManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
    );
  });

  describe('executeDecomposition', () => {
    it('should return messageId and threadId when threadId is provided', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-1', threadId: 'thread-1' });

      const result = await manager.executeDecomposition('user-1', {
        content: 'A complex task with enough characters',
        threadId: 'thread-1',
        maxSubTasks: 3,
      });

      expect(result).toEqual({ messageId: 'msg-1', threadId: 'thread-1' });
    });

    it('should create a new thread when no threadId is provided', async () => {
      threadsRepo.create!.mockResolvedValue({ id: 'new-thread', userId: 'user-1' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-2', threadId: 'new-thread' });

      const result = await manager.executeDecomposition('user-1', {
        content: 'A complex task with enough characters',
        maxSubTasks: 2,
      });

      expect(threadsRepo.create).toHaveBeenCalled();
      expect(result.threadId).toBe('new-thread');
    });

    it('should always resolve (fire-and-forget for background)', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-3', threadId: 'thread-1' });

      const promise = manager.executeDecomposition('user-1', {
        content: 'A complex task with enough characters',
        threadId: 'thread-1',
        maxSubTasks: 3,
      });

      await expect(promise).resolves.toBeDefined();
    });

    it('should store the user message in the repository', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-4', threadId: 'thread-1' });

      await manager.executeDecomposition('user-1', {
        content: 'A complex task to decompose and execute',
        threadId: 'thread-1',
        maxSubTasks: 3,
      });

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-1',
          role: 'USER',
          content: 'A complex task to decompose and execute',
        }),
      );
    });
  });

  describe('DTO validation', () => {
    it('should accept valid input', () => {
      const result = decomposeTaskSchema.safeParse({
        content: 'A task that is long enough',
        threadId: 'thread-abc',
        maxSubTasks: 3,
      });
      expect(result.success).toBe(true);
    });

    it('should reject content shorter than 10 chars', () => {
      const result = decomposeTaskSchema.safeParse({
        content: 'short',
        maxSubTasks: 2,
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxSubTasks greater than 5', () => {
      const result = decomposeTaskSchema.safeParse({
        content: 'A long enough task content here',
        maxSubTasks: 6,
      });
      expect(result.success).toBe(false);
    });

    it('should apply default maxSubTasks of 3 when not provided', () => {
      const result = decomposeTaskSchema.safeParse({
        content: 'A long enough task content here',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxSubTasks).toBe(3);
      }
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with decomposed:true on success', async () => {
      const subTasksJson = JSON.stringify([
        { title: 'Research', instruction: 'Do research', category: 'research' },
        { title: 'Write', instruction: 'Write report', category: 'writing' },
      ]);

      httpRequest
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: subTasksJson } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'Research result' } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'Writing result' } })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { response: 'Merged final answer' },
        });

      messagesRepo.create!.mockResolvedValue({ id: 'assist-1', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task', 3);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect(
        (assistantCall![0] as { metadata?: { decomposed?: boolean } }).metadata?.decomposed,
      ).toBe(true);
    });

    it('should emit SSE error and store error message on Ollama failure', async () => {
      httpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: { response: '' } });
      messagesRepo.create!.mockResolvedValue({ id: 'err-msg', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task', 2);

      expect(streamService.emitError).toHaveBeenCalledWith('thread-1', expect.any(String));
      const errorCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { metadata?: { error?: boolean } }).metadata?.error === true,
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle JSON parse failure and fall back to single task', async () => {
      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { response: 'not valid json at all' },
        })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'Single task result' } })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { response: 'Final merged answer' },
        });

      messagesRepo.create!.mockResolvedValue({ id: 'msg-fallback', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task content', 3);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect(
        (assistantCall![0] as { metadata?: { decomposed?: boolean } }).metadata?.decomposed,
      ).toBe(true);
    });

    it('should emit SSE completion on success', async () => {
      httpRequest
        .mockResolvedValueOnce(
          makeOllamaSuccess(
            JSON.stringify([{ title: 'Task', instruction: 'Do it', category: 'general' }]),
          ),
        )
        .mockResolvedValueOnce(makeOllamaSuccess('result'))
        .mockResolvedValueOnce(makeOllamaSuccess('merged'));

      messagesRepo.create!.mockResolvedValue({ id: 'msg-done', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task content here', 2);

      expect(streamService.emitCompletion).toHaveBeenCalledWith('thread-1', 'local-ollama', 'AUTO');
    });
  });

  describe('model selection', () => {
    it('rejects manual selection with unsupported provider before queuing', async () => {
      const selectionService: Partial<
        Record<keyof AdvancedModuleModelSelectionService, jest.Mock>
      > = {
        resolveSelection: jest
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };
      const isolated = new TaskDecompositionManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeDecomposition('user-1', {
          content: 'A complex task with enough characters',
          threadId: 'thread-1',
          maxSubTasks: 2,
          requestedProvider: 'OPENAI',
          requestedModel: 'gpt-4.1',
          modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        }),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('persists modelSelection + routeRoadmap for MANUAL_MODEL execution', async () => {
      const manualResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      httpRequest
        .mockResolvedValueOnce(
          makeOllamaSuccess(
            JSON.stringify([{ title: 'T', instruction: 'do', category: 'general' }]),
          ),
        )
        .mockResolvedValueOnce(makeOllamaSuccess('sub-result'))
        .mockResolvedValueOnce(makeOllamaSuccess('merged'));
      messagesRepo.create!.mockResolvedValue({ id: 'msg-manual', threadId: 'thread-m' });

      await manager.executeInBackground('thread-m', 'Some complex task', 2, manualResolution);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            routeRoadmap?: {
              finalProvider?: string;
              finalModel?: string;
              selectedProvider?: string;
              selectedModel?: string;
            };
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.actualModel).toBe('qwen2.5:7b');
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.MANUAL_MODEL);
      expect(metadata?.routeRoadmap?.finalProvider).toBe('local-ollama');
      expect(metadata?.routeRoadmap?.finalModel).toBe('qwen2.5:7b');
    });

    it('uses AUTO fallback resolution when no selection service is injected', async () => {
      httpRequest
        .mockResolvedValueOnce(
          makeOllamaSuccess(
            JSON.stringify([{ title: 'T', instruction: 'do', category: 'general' }]),
          ),
        )
        .mockResolvedValueOnce(makeOllamaSuccess('sub-result'))
        .mockResolvedValueOnce(makeOllamaSuccess('merged'));
      messagesRepo.create!.mockResolvedValue({ id: 'msg-auto', threadId: 'thread-a' });

      await manager.executeInBackground('thread-a', 'Some complex task', 2);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: { modelSelection?: AdvancedModelSelectionResolution };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.AUTO);
      expect(metadata?.modelSelection?.actualProvider).toBe('local-ollama');
    });
  });
});
