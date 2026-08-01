import { ChatMessagesService } from '../services/chat-messages.service';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatExecutionManager } from '../managers/chat-execution.manager';
import { type ContextAssemblyManager } from '../managers/context-assembly.manager';
import { type AnswerRepairManager } from '../managers/answer-repair.manager';
import { type TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { type ConsensusExecutionManager } from '../managers/consensus-execution.manager';
import { type EscalationChainManager } from '../managers/escalation-chain.manager';
import { type ParallelExecutionManager } from '../managers/parallel-execution.manager';
import { type BestOfNManager } from '../managers/best-of-n.manager';
import { type CostEnsembleManager } from '../managers/cost-ensemble.manager';
import { type VerifierManager } from '../managers/verifier.manager';
import { type PipelineManager } from '../managers/pipeline.manager';
import { type RolePackManager } from '../managers/role-pack.manager';
import { type ChatStreamService } from '../services/chat-stream.service';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';

const mockThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Test Thread',
  routingMode: 'AUTO' as const,
  lastProvider: null,
  lastModel: null,
  preferredProvider: null,
  preferredModel: null,
  isPinned: false,
  isArchived: false,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'USER' as const,
  content: 'Hello world',
  provider: null,
  model: null,
  routingMode: null,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  feedback: null,
  metadata: null,
  createdAt: new Date(),
};

const mockMessagesRepository = (): Record<keyof ChatMessagesRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByThreadId: jest.fn(),
  findRecentByThreadId: jest.fn(),
  findAllByThreadIdAscending: jest.fn(),
  countByThreadId: jest.fn(),
  updateFeedback: jest.fn(),
  deleteByThreadId: jest.fn(),
});

const mockThreadsRepository = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  findById: jest.fn(),
});

const mockExecutionManager = (): Partial<Record<keyof ChatExecutionManager, jest.Mock>> => ({
  execute: jest.fn(),
});

const mockContextAssembly = (): Partial<Record<keyof ContextAssemblyManager, jest.Mock>> => ({
  assemble: jest.fn().mockResolvedValue({
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }),
  buildPromptString: jest.fn().mockReturnValue(''),
  buildChatMessages: jest.fn().mockReturnValue([]),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(void 0),
  subscribe: jest.fn().mockResolvedValue(void 0),
});

describe('ChatMessagesService', () => {
  let service: ChatMessagesService;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let executionManager: ReturnType<typeof mockExecutionManager>;
  let contextAssembly: ReturnType<typeof mockContextAssembly>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;
  let streamService: Partial<Record<keyof ChatStreamService, jest.Mock>>;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    threadsRepo = mockThreadsRepository();
    executionManager = mockExecutionManager();
    contextAssembly = mockContextAssembly();
    rabbitMQ = mockRabbitMQ();
    streamService = {
      emitRequestAccepted: jest.fn(),
      emitCompletion: jest.fn(),
      emitError: jest.fn(),
    };
    service = new ChatMessagesService(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      executionManager as unknown as ChatExecutionManager,
      contextAssembly as unknown as ContextAssemblyManager,
      { executeParallel: jest.fn() } as unknown as ParallelExecutionManager,
      { executeConsensus: jest.fn() } as unknown as ConsensusExecutionManager,
      { executeEscalationChain: jest.fn() } as unknown as EscalationChainManager,
      { executeRepair: jest.fn() } as unknown as AnswerRepairManager,
      { executeDecomposition: jest.fn() } as unknown as TaskDecompositionManager,
      { executeBestOfN: jest.fn() } as unknown as BestOfNManager,
      { executeCostEnsemble: jest.fn() } as unknown as CostEnsembleManager,
      { executeVerify: jest.fn() } as unknown as VerifierManager,
      { executePipeline: jest.fn() } as unknown as PipelineManager,
      { executeRolePack: jest.fn() } as unknown as RolePackManager,
      streamService as unknown as ChatStreamService,
      rabbitMQ as unknown as RabbitMQService,
      { write: jest.fn(), getByMessageId: jest.fn() } as unknown as ConstructorParameters<
        typeof ChatMessagesService
      >[16],
      {
        assertCanSendMessage: jest.fn(),
        assertResearchAccess: jest.fn(),
        recordUsage: jest.fn(),
      } as unknown as ConstructorParameters<typeof ChatMessagesService>[17],
      // ResearchEnricherManager — no-op for legacy tests; flows that don't set
      // researchMode never reach the enricher.
      {
        enrich: jest.fn().mockResolvedValue({ evidence: '', sources: [], mode: 'NONE' }),
      } as unknown as ConstructorParameters<typeof ChatMessagesService>[18],
    );
  });

  describe('createMessage', () => {
    it('should create a message and publish event', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage(
        'user-1',
        { threadId: 'thread-1', content: 'Hello world' },
        '',
      );

      expect(result).toEqual(mockMessage);
      expect(messagesRepo.create).toHaveBeenCalledWith({
        threadId: 'thread-1',
        role: 'USER',
        content: 'Hello world',
        routingMode: 'AUTO',
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_CREATED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          userId: 'user-1',
        }),
      );
    });

    it('should preserve AUTO routing even when the thread has a preferred model', async () => {
      threadsRepo.findById!.mockResolvedValue({
        ...mockThread,
        preferredProvider: 'OLLAMA',
        preferredModel: 'gemma4:e4b',
      });
      messagesRepo.create.mockResolvedValue(mockMessage);

      await service.createMessage(
        'user-1',
        { threadId: 'thread-1', content: 'Generate a picture of a lighthouse' },
        '',
      );

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          routingMode: 'AUTO',
        }),
      );
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', { threadId: 'nonexistent', content: 'Hello' }, ''),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(
        service.createMessage('other-user', { threadId: 'thread-1', content: 'Hello' }, ''),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.findByThreadId.mockResolvedValue([mockMessage]);
      messagesRepo.countByThreadId.mockResolvedValue(1);

      const result = await service.getMessages('thread-1', 'user-1', {
        page: 1,
        limit: 50,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(
        service.getMessages('nonexistent', 'user-1', { page: 1, limit: 50 }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getMessage', () => {
    it('should return message when found and user owns thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      const result = await service.getMessage('msg-1', 'user-1');

      expect(result).toEqual(mockMessage);
    });

    it('should throw EntityNotFoundException when message not found', async () => {
      messagesRepo.findById.mockResolvedValue(null);

      await expect(service.getMessage('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(service.getMessage('msg-1', 'other-user')).rejects.toThrow(BusinessException);
    });

    it('should throw EntityNotFoundException when thread not found for message', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(service.getMessage('msg-1', 'user-1')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('regenerateMessage', () => {
    it('should publish regeneration event and return message', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      const result = await service.regenerateMessage('msg-1', 'user-1');

      expect(result).toEqual(mockMessage);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_CREATED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          userId: 'user-1',
          regenerate: true,
        }),
      );
    });

    it('should throw EntityNotFoundException when message not found', async () => {
      messagesRepo.findById.mockResolvedValue(null);

      await expect(service.regenerateMessage('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(service.regenerateMessage('msg-1', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(service.regenerateMessage('msg-1', 'other-user')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('executeVerify', () => {
    it('should delegate to verifierManager.executeVerify', async () => {
      const mockResult = { messageId: 'msg-v-1', threadId: 'thread-v-1' };
      const verifierManager = { executeVerify: jest.fn().mockResolvedValue(mockResult) };
      const localService = new ChatMessagesService(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        executionManager as unknown as ChatExecutionManager,
        contextAssembly as unknown as ContextAssemblyManager,
        { executeParallel: jest.fn() } as unknown as ParallelExecutionManager,
        { executeConsensus: jest.fn() } as unknown as ConsensusExecutionManager,
        { executeEscalationChain: jest.fn() } as unknown as EscalationChainManager,
        { executeRepair: jest.fn() } as unknown as AnswerRepairManager,
        { executeDecomposition: jest.fn() } as unknown as TaskDecompositionManager,
        { executeBestOfN: jest.fn() } as unknown as BestOfNManager,
        { executeCostEnsemble: jest.fn() } as unknown as CostEnsembleManager,
        verifierManager as unknown as VerifierManager,
        { executePipeline: jest.fn() } as unknown as PipelineManager,
        { executeRolePack: jest.fn() } as unknown as RolePackManager,
        {
          emitRequestAccepted: jest.fn(),
          emitCompletion: jest.fn(),
        } as unknown as ChatStreamService,
        rabbitMQ as unknown as RabbitMQService,
        { write: jest.fn(), getByMessageId: jest.fn() } as unknown as ConstructorParameters<
          typeof ChatMessagesService
        >[16],
        {
          assertCanSendMessage: jest.fn(),
          assertResearchAccess: jest.fn(),
          recordUsage: jest.fn(),
        } as unknown as ConstructorParameters<typeof ChatMessagesService>[17],
        {
          enrich: jest.fn().mockResolvedValue({ evidence: '', sources: [], mode: 'NONE' }),
        } as unknown as ConstructorParameters<typeof ChatMessagesService>[18],
      );

      const result = await localService.executeVerify(
        'user-1',
        {
          content: 'test',
          maxRevisions: 1,
        },
        '',
      );

      expect(verifierManager.executeVerify).toHaveBeenCalledWith(
        'user-1',
        {
          content: 'test',
          maxRevisions: 1,
        },
        '',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getMessages - edge cases', () => {
    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(
        service.getMessages('thread-1', 'other-user', { page: 1, limit: 50 }),
      ).rejects.toThrow(BusinessException);
    });

    it('should calculate totalPages correctly for multiple pages', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.findByThreadId.mockResolvedValue([mockMessage]);
      messagesRepo.countByThreadId.mockResolvedValue(75);

      const result = await service.getMessages('thread-1', 'user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.meta.totalPages).toBe(4);
      expect(result.meta.total).toBe(75);
    });
  });

  describe('setFeedback', () => {
    it('publishes a feedback learning event after storing feedback', async () => {
      const assistantMessage = {
        ...mockMessage,
        role: 'ASSISTANT' as const,
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        routingMode: 'AUTO' as const,
        routerModel: 'qwen3:1.7b',
        metadata: {
          sourceMessageId: 'user-msg-1',
          judgeDecision: 'ACCEPT',
          judgeConfidence: 0.91,
        },
      };
      messagesRepo.findById.mockResolvedValue(assistantMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.updateFeedback.mockResolvedValue({
        ...assistantMessage,
        feedback: 'positive',
      });

      await service.setFeedback('user-1', assistantMessage.id, 'positive');

      expect(messagesRepo.updateFeedback).toHaveBeenCalledWith('msg-1', 'positive');
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_FEEDBACK_SET,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          feedback: 'positive',
          routingMessageId: 'user-msg-1',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
        }),
      );
    });
  });

  describe('handleMessageRouted', () => {
    it('preserves localizable business error metadata on the stored assistant response', async () => {
      const routedPayload = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      };
      const localizableError = new BusinessException(
        'The selected model cannot process video attachments',
        'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
        undefined,
        'chat.errors.videoAttachmentProviderUnsupported',
      );
      messagesRepo.findRecentByThreadId.mockResolvedValue([mockMessage]);
      threadsRepo.findById!.mockResolvedValue(mockThread);
      executionManager.execute!.mockRejectedValue(localizableError);
      messagesRepo.create.mockResolvedValue({
        ...mockMessage,
        role: 'ASSISTANT',
        content: localizableError.message,
      });

      await expect(service.handleMessageRouted(routedPayload)).rejects.toBe(localizableError);

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            error: true,
            sourceMessageId: 'msg-1',
            errorCode: 'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
            errorMessageKey: 'chat.errors.videoAttachmentProviderUnsupported',
          },
        }),
      );
      expect(streamService.emitError).toHaveBeenCalledWith(
        'thread-1',
        'The selected model cannot process video attachments',
        {
          code: 'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
          messageKey: 'chat.errors.videoAttachmentProviderUnsupported',
        },
      );
    });

    it('assembles context and attachments from the routed user message, excluding newer turns', async () => {
      const olderAssistant = {
        ...mockMessage,
        id: 'msg-assistant-old',
        role: 'ASSISTANT' as const,
        content: 'Earlier answer',
      };
      const routedUserMessage = {
        ...mockMessage,
        id: 'msg-routed',
        content: 'Describe old-video.mp4',
        metadata: { fileIds: ['file-old'] },
      };
      const newerUserMessage = {
        ...mockMessage,
        id: 'msg-newer',
        content: 'Describe new-video.mp4',
        metadata: { fileIds: ['file-new'] },
      };
      const errorAssistant = {
        ...mockMessage,
        id: 'msg-error',
        role: 'ASSISTANT' as const,
        content: 'Provider failed',
      };
      const routedPayload = {
        messageId: 'msg-routed',
        threadId: 'thread-1',
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
        routingMode: 'AUTO',
        timestamp: new Date().toISOString(),
      };

      messagesRepo.findRecentByThreadId.mockResolvedValue([
        newerUserMessage,
        routedUserMessage,
        olderAssistant,
      ]);
      threadsRepo.findById!.mockResolvedValue(mockThread);
      executionManager.execute!.mockRejectedValue(new Error('Provider failed'));
      messagesRepo.create.mockResolvedValue(errorAssistant);

      await expect(service.handleMessageRouted(routedPayload)).rejects.toThrow('Provider failed');

      expect(contextAssembly.assemble).toHaveBeenCalledWith(
        'user-1',
        [olderAssistant, routedUserMessage],
        expect.any(Object),
        undefined,
        ['file-old'],
        undefined,
        'AUTO',
      );
    });

    it('fails closed when the routed message is absent from the recent thread window', async () => {
      messagesRepo.findRecentByThreadId.mockResolvedValue([
        { ...mockMessage, id: 'msg-different' },
      ]);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(
        service.handleMessageRouted({
          messageId: 'msg-missing',
          threadId: 'thread-1',
          selectedProvider: 'GEMINI',
          selectedModel: 'gemini-2.5-flash',
          routingMode: 'AUTO',
          timestamp: new Date().toISOString(),
        }),
      ).rejects.toMatchObject({ code: 'ROUTED_MESSAGE_NOT_FOUND' });

      expect(contextAssembly.assemble).not.toHaveBeenCalled();
      expect(executionManager.execute).not.toHaveBeenCalled();
    });

    it('publishes message.completed even when execution fails after storing an error response', async () => {
      const routedPayload = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'FILE_GENERATION',
        selectedModel: 'auto',
        routingMode: 'AUTO',
        timestamp: new Date().toISOString(),
      };
      const errorAssistant = {
        ...mockMessage,
        id: 'msg-error-1',
        role: 'ASSISTANT' as const,
        content: '⚠️ Cloud provider GEMINI returned status 429',
        provider: 'FILE_GENERATION',
        model: 'auto',
        routingMode: 'AUTO' as const,
        usedFallback: true,
        metadata: { error: true, sourceMessageId: 'msg-1' },
      };

      messagesRepo.findRecentByThreadId.mockResolvedValue([mockMessage]);
      threadsRepo.findById!.mockResolvedValue(mockThread);
      executionManager.execute!.mockRejectedValue(
        new Error('Cloud provider GEMINI returned status 429'),
      );
      messagesRepo.create.mockResolvedValue(errorAssistant);

      await expect(service.handleMessageRouted(routedPayload)).rejects.toThrow(
        'Cloud provider GEMINI returned status 429',
      );

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-1',
          role: 'ASSISTANT',
          provider: 'FILE_GENERATION',
          model: 'auto',
          usedFallback: true,
          metadata: { error: true, sourceMessageId: 'msg-1' },
        }),
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_COMPLETED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          assistantMessageId: 'msg-error-1',
          provider: 'FILE_GENERATION',
          model: 'auto',
          usedFallback: true,
          content: '⚠️ Cloud provider GEMINI returned status 429',
        }),
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_COMPLETED,
        expect.objectContaining({
          executionSuccess: false,
          finalStatus: 'failed',
          errorMessage: 'Cloud provider GEMINI returned status 429',
        }),
      );
    });
  });
});
