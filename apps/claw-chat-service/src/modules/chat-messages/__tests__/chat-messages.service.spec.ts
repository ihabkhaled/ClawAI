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
import { type RouterTraceStreamService } from '../services/router-trace-stream.service';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RepairType } from '../../../common/enums/repair-type.enum';

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
  judgeEnabled: false,
  judgeModel: null,
  criticEnabled: false,
  criticModel: null,
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
  createUserMessageWithinDailyLimit: jest.fn(),
  findById: jest.fn(),
  findByThreadId: jest.fn(),
  searchByThreadId: jest.fn().mockResolvedValue([]),
  findRecentByThreadId: jest.fn(),
  findAllByThreadIdAscending: jest.fn(),
  countByThreadId: jest.fn(),
  updateFeedback: jest.fn(),
  updateMetadata: jest.fn(),
  deleteById: jest.fn(),
  deleteByThreadId: jest.fn(),
});

const mockThreadsRepository = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  findById: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
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
  let assertCanSendMessage: jest.Mock;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    messagesRepo.createUserMessageWithinDailyLimit.mockResolvedValue(mockMessage);
    threadsRepo = mockThreadsRepository();
    executionManager = mockExecutionManager();
    contextAssembly = mockContextAssembly();
    rabbitMQ = mockRabbitMQ();
    streamService = {
      emitRequestAccepted: jest.fn(),
      emitCompletion: jest.fn(),
      emitError: jest.fn(),
    };
    assertCanSendMessage = jest.fn().mockResolvedValue({
      isAdmin: false,
      plan: { limits: { messagesPerDay: 12 } },
      allowedModels: [],
    });
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
      { render: jest.fn().mockReturnValue(0) } as unknown as RouterTraceStreamService,
      rabbitMQ as unknown as RabbitMQService,
      {
        write: jest.fn().mockResolvedValue(undefined),
        getByMessageId: jest.fn(),
      } as unknown as ConstructorParameters<typeof ChatMessagesService>[17],
      {
        assertCanSendMessage,
        assertResearchAccess: jest.fn(),
        recordUsage: jest.fn(),
      } as unknown as ConstructorParameters<typeof ChatMessagesService>[18],
      // ResearchEnricherManager — no-op for legacy tests; flows that don't set
      // researchMode never reach the enricher.
      {
        enrich: jest.fn().mockResolvedValue({ evidence: '', sources: [], mode: 'NONE' }),
      } as unknown as ConstructorParameters<typeof ChatMessagesService>[19],
      { tryHandleRouted: jest.fn().mockResolvedValue(false) } as unknown as ConstructorParameters<
        typeof ChatMessagesService
      >[20],
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
      expect(messagesRepo.createUserMessageWithinDailyLimit).toHaveBeenCalledWith(
        'user-1',
        {
          threadId: 'thread-1',
          role: 'USER',
          content: 'Hello world',
          routingMode: 'AUTO',
        },
        12,
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_CREATED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          userId: 'user-1',
        }),
      );
    });

    it('rejects creation when the atomic daily message limit is exhausted', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.createUserMessageWithinDailyLimit.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', { threadId: 'thread-1', content: 'Blocked' }, ''),
      ).rejects.toMatchObject({ code: 'PLAN_DAILY_MESSAGE_LIMIT_EXCEEDED', status: 429 });
      expect(rabbitMQ.publish).not.toHaveBeenCalled();
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

      expect(messagesRepo.createUserMessageWithinDailyLimit).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          routingMode: 'AUTO',
        }),
        12,
      );
    });

    it('gates normal critic threads on judge, critic, and judge permission', async () => {
      threadsRepo.findById!.mockResolvedValue({
        ...mockThread,
        judgeEnabled: true,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      });
      messagesRepo.create.mockResolvedValue(mockMessage);

      await service.createMessage(
        'user-1',
        { threadId: 'thread-1', content: 'Review this answer' },
        '',
      );

      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requireFeature: ['allowJudgeMode', 'allowCriticReview'],
      });
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'JUDGE_USE',
      });
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

    it('gates regeneration when critic review is enabled on the thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue({
        ...mockThread,
        judgeEnabled: true,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      });

      await service.regenerateMessage('msg-1', 'user-1');

      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requireFeature: ['allowJudgeMode', 'allowCriticReview'],
      });
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'JUDGE_USE',
      });
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
        { render: jest.fn().mockReturnValue(0) } as unknown as RouterTraceStreamService,
        rabbitMQ as unknown as RabbitMQService,
        { write: jest.fn(), getByMessageId: jest.fn() } as unknown as ConstructorParameters<
          typeof ChatMessagesService
        >[17],
        {
          assertCanSendMessage: jest.fn(),
          assertResearchAccess: jest.fn(),
          recordUsage: jest.fn(),
        } as unknown as ConstructorParameters<typeof ChatMessagesService>[18],
        {
          enrich: jest.fn().mockResolvedValue({ evidence: '', sources: [], mode: 'NONE' }),
        } as unknown as ConstructorParameters<typeof ChatMessagesService>[19],
        { tryHandleRouted: jest.fn().mockResolvedValue(false) } as unknown as ConstructorParameters<
          typeof ChatMessagesService
        >[20],
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

  describe('per-page RBAC gates for the 9 orchestration labs', () => {
    // Every orchestration entry point used to have NO backend access check at
    // all (only executeVerify checked ROUTER_USE) — the frontend route guard
    // was the only thing hiding these pages. Each now asserts its own
    // permission + plan feature before doing any work, matching the pattern
    // /chat/compare already used (assertCompareAccess).
    beforeEach(() => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
    });

    it('createConsensusMessage requires CONSENSUS_MODE_USE + allowConsensusMode', async () => {
      await service.createConsensusMessage(
        'user-1',
        {
          threadId: 'thread-1',
          content: 'compare these',
          models: [
            { provider: 'OPENAI', model: 'gpt-4o' },
            { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          ],
        },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'CONSENSUS_MODE_USE',
        requireFeature: 'allowConsensusMode',
      });
    });

    it('createEscalationChainMessage requires ESCALATION_CHAIN_USE + allowEscalationChain', async () => {
      await service.createEscalationChainMessage(
        'user-1',
        {
          threadId: 'thread-1',
          content: 'escalate this',
          chain: [
            { provider: 'OPENAI', model: 'gpt-4o-mini' },
            { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
          ],
        },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'ESCALATION_CHAIN_USE',
        requireFeature: 'allowEscalationChain',
      });
    });

    it('createRepairMessage requires REPAIR_LAB_USE + allowRepairLab', async () => {
      await service.createRepairMessage(
        'user-1',
        {
          threadId: 'thread-1',
          content: 'repair this answer',
          repairTypes: [RepairType.COMPLETENESS],
        },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'REPAIR_LAB_USE',
        requireFeature: 'allowRepairLab',
      });
    });

    it('executeDecomposition requires TASK_DECOMPOSER_USE + allowTaskDecomposer', async () => {
      await service.executeDecomposition(
        'user-1',
        { threadId: 'thread-1', content: 'break this task down into steps', maxSubTasks: 3 },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'TASK_DECOMPOSER_USE',
        requireFeature: 'allowTaskDecomposer',
      });
    });

    it('executeBestOfN requires BEST_OF_N_USE + allowBestOfN', async () => {
      await service.executeBestOfN(
        'user-1',
        { threadId: 'thread-1', content: 'generate candidates', n: 3 },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'BEST_OF_N_USE',
        requireFeature: 'allowBestOfN',
      });
    });

    it('executeCostEnsemble requires COST_ENSEMBLE_USE + allowCostEnsemble', async () => {
      await service.executeCostEnsemble(
        'user-1',
        { threadId: 'thread-1', content: 'answer cheaply' },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'COST_ENSEMBLE_USE',
        requireFeature: 'allowCostEnsemble',
      });
    });

    it('executeVerify requires VERIFIER_USE + allowVerifier (no longer ROUTER_USE)', async () => {
      await service.executeVerify('user-1', { content: 'verify this', maxRevisions: 1 }, '');
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'VERIFIER_USE',
        requireFeature: 'allowVerifier',
      });
    });

    it('executePipeline requires PIPELINE_LAB_USE + allowPipelineLab', async () => {
      await service.executePipeline(
        'user-1',
        { threadId: 'thread-1', content: 'run the pipeline', template: 'analyze-reason-format' },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'PIPELINE_LAB_USE',
        requireFeature: 'allowPipelineLab',
      });
    });

    it('executeRolePack requires ROLE_PACK_USE + allowRolePack', async () => {
      await service.executeRolePack(
        'user-1',
        { threadId: 'thread-1', content: 'assemble the role pack', pack: 'coding-team' },
        '',
      );
      expect(assertCanSendMessage).toHaveBeenCalledWith('user-1', {
        requirePermission: 'ROLE_PACK_USE',
        requireFeature: 'allowRolePack',
      });
    });

    it('rejects createConsensusMessage before touching the thread or the manager when access is denied', async () => {
      assertCanSendMessage.mockRejectedValueOnce(
        new BusinessException(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS',
          403,
        ),
      );

      await expect(
        service.createConsensusMessage(
          'user-1',
          {
            threadId: 'thread-1',
            content: 'compare these',
            models: [
              { provider: 'OPENAI', model: 'gpt-4o' },
              { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
            ],
          },
          '',
        ),
      ).rejects.toThrow(BusinessException);
      expect(threadsRepo.findById).not.toHaveBeenCalled();
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
      threadsRepo.findById!.mockResolvedValue({
        ...mockThread,
        judgeEnabled: true,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      });
      executionManager.execute!.mockRejectedValue(localizableError);
      messagesRepo.create.mockResolvedValue({
        ...mockMessage,
        role: 'ASSISTANT',
        content: localizableError.message,
      });

      await expect(service.handleMessageRouted(routedPayload)).rejects.toBe(localizableError);

      expect(executionManager.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          judgeEnabled: true,
          criticEnabled: true,
          criticModel: 'ANTHROPIC:claude-sonnet-4',
        }),
        expect.anything(),
        expect.objectContaining({
          criticEnabled: true,
          criticModel: 'ANTHROPIC:claude-sonnet-4',
        }),
      );

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

    // Live UAT (2026-08-16) — the routing decision's confidence/costClass
    // were computed by routing-service but never reached the stored
    // message's routeRoadmap, so the frontend's "Why this model?" panel
    // silently rendered them as "-"/"Unknown" for every AUTO message.
    it('carries confidence and costClass from the routed payload into the stored routeRoadmap', async () => {
      const routedPayload = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
        routingMode: 'AUTO',
        confidence: 0.92,
        costClass: 'medium',
        timestamp: new Date().toISOString(),
      };
      const assistantMessage = {
        ...mockMessage,
        id: 'msg-assistant-1',
        role: 'ASSISTANT' as const,
        content: 'Hi there!',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
      };

      messagesRepo.findRecentByThreadId.mockResolvedValue([mockMessage]);
      threadsRepo.findById!.mockResolvedValue(mockThread);
      executionManager.execute!.mockResolvedValue({
        content: 'Hi there!',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 1200,
        usedFallback: false,
      });
      messagesRepo.create.mockResolvedValue(assistantMessage);

      await service.handleMessageRouted(routedPayload);

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            routeRoadmap: expect.objectContaining({
              confidence: 0.92,
              costClass: 'medium',
            }),
          }),
        }),
      );
    });

    // A thread's title was whatever the list truncated the first prompt to,
    // cut mid-word and mid-markdown. It is now derived from the opening
    // sentence — and derived rather than model-written, because every call in
    // this service runs through the token-deduction chokepoint and a title is
    // not something the user asked to spend their allowance on.
    describe('thread auto-titling', () => {
      const routedPayload = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
        routingMode: 'AUTO',
        timestamp: new Date().toISOString(),
      };

      function arrangeAnswer(): void {
        messagesRepo.findRecentByThreadId.mockResolvedValue([mockMessage]);
        executionManager.execute!.mockResolvedValue({
          content: 'Hi there!',
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          latencyMs: 1200,
          usedFallback: false,
        });
        messagesRepo.create.mockResolvedValue({
          ...mockMessage,
          id: 'msg-assistant-1',
          role: 'ASSISTANT' as const,
        });
      }

      it('names an unnamed thread after its opening sentence', async () => {
        arrangeAnswer();
        threadsRepo.findById!.mockResolvedValue({ ...mockThread, title: null });
        messagesRepo.findAllByThreadIdAscending.mockResolvedValue([
          { ...mockMessage, role: 'USER' as const, content: 'Explain partial indexes. Be brief.' },
        ]);

        await service.handleMessageRouted(routedPayload);

        expect(threadsRepo.update).toHaveBeenCalledWith(
          'thread-1',
          expect.objectContaining({ title: 'Explain partial indexes' }),
        );
      });

      it('never renames a thread that already has a title', async () => {
        // A thread that renamed itself as the conversation moved on would be
        // unfindable in the list, and would silently discard a name the person
        // typed themselves.
        arrangeAnswer();
        threadsRepo.findById!.mockResolvedValue({ ...mockThread, title: 'Chosen by hand' });

        await service.handleMessageRouted(routedPayload);

        expect(messagesRepo.findAllByThreadIdAscending).not.toHaveBeenCalled();
        expect(threadsRepo.update).toHaveBeenCalledWith(
          'thread-1',
          expect.not.objectContaining({ title: expect.anything() }),
        );
      });

      it('treats a blank title as unnamed', async () => {
        arrangeAnswer();
        threadsRepo.findById!.mockResolvedValue({ ...mockThread, title: '   ' });
        messagesRepo.findAllByThreadIdAscending.mockResolvedValue([
          { ...mockMessage, role: 'USER' as const, content: 'Fix the build' },
        ]);

        await service.handleMessageRouted(routedPayload);

        expect(threadsRepo.update).toHaveBeenCalledWith(
          'thread-1',
          expect.objectContaining({ title: 'Fix the build' }),
        );
      });

      it('skips past a system or tool row to find the opening turn', async () => {
        arrangeAnswer();
        threadsRepo.findById!.mockResolvedValue({ ...mockThread, title: null });
        messagesRepo.findAllByThreadIdAscending.mockResolvedValue([
          { ...mockMessage, role: 'SYSTEM' as const, content: 'You are a helpful assistant.' },
          { ...mockMessage, role: 'USER' as const, content: 'Why is the build red?' },
        ]);

        await service.handleMessageRouted(routedPayload);

        expect(threadsRepo.update).toHaveBeenCalledWith(
          'thread-1',
          expect.objectContaining({ title: 'Why is the build red?' }),
        );
      });

      it('leaves the thread unnamed when nothing usable can be derived', async () => {
        // A title of backticks is worse than no title, and the list already
        // renders an unnamed thread perfectly well.
        arrangeAnswer();
        threadsRepo.findById!.mockResolvedValue({ ...mockThread, title: null });
        messagesRepo.findAllByThreadIdAscending.mockResolvedValue([
          { ...mockMessage, role: 'USER' as const, content: '```\ncode only\n```' },
        ]);

        await service.handleMessageRouted(routedPayload);

        expect(threadsRepo.update).toHaveBeenCalledWith(
          'thread-1',
          expect.not.objectContaining({ title: expect.anything() }),
        );
      });
    });
  });
});
