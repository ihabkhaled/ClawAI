import { AppConfig } from '../app/config/app.config';
import { EscalationChainManager } from '../modules/chat-messages/managers/escalation-chain.manager';
import { EscalationChainStatus } from '../common/enums/escalation-chain-status.enum';
import type { EscalationChainStep } from '../modules/chat-messages/types/escalation-chain.types';
import type { AssembledContext } from '../modules/chat-messages/types/context.types';
import {
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../modules/chat-messages/utilities/assembled-context.utility';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  CHAT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'a'.repeat(32),
  OLLAMA_SERVICE_URL: 'http://localhost:4008',
  CONNECTOR_SERVICE_URL: 'http://localhost:4003',
  MEMORY_SERVICE_URL: 'http://localhost:4005',
  FILE_SERVICE_URL: 'http://localhost:4006',
  IMAGE_SERVICE_URL: 'http://localhost:4012',
  FILE_GENERATION_SERVICE_URL: 'http://localhost:4013',
  OLLAMA_GENERATE_TIMEOUT_MS: 300_000,
  CHAT_PORT: 4002,
} as any);

describe('EscalationChainManager', () => {
  let manager: EscalationChainManager;

  const mockChatExecutionManager = {
    callProvider: jest.fn(),
  };

  const mockContextAssemblyManager = {
    assemble: jest.fn(),
  };

  const mockChatMessagesRepository = {
    create: jest.fn(),
    findRecentByThreadId: jest.fn(),
  };

  const mockChatThreadsRepository = {
    findById: jest.fn(),
  };

  const mockChatStreamService = {
    emitCompletion: jest.fn(),
    emitError: jest.fn(),
  };

  const mockQualityCheckManager = {
    checkResponseQuality: jest.fn(),
  };

  // Universal-research PR2: research-enricher dependency.
  const mockResearchEnricherManager = {
    enrichForOrchestration: jest.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
  };

  const mockContext: AssembledContext = {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
  };

  const twoStepChain: EscalationChainStep[] = [
    { provider: 'OPENAI', model: 'gpt-4o-mini' },
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
  ];

  const threeStepChain: EscalationChainStep[] = [
    { provider: 'OPENAI', model: 'gpt-4o-mini' },
    { provider: 'OPENAI', model: 'gpt-4o' },
    { provider: 'ANTHROPIC', model: 'claude-opus-4' },
  ];

  const buildLlmResponse = (provider: string, model: string, content = 'Good response') => ({
    provider,
    model,
    content,
    latencyMs: 100,
    inputTokens: 10,
    outputTokens: 20,
    usedFallback: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-1', content: 'test' });
    mockChatMessagesRepository.findRecentByThreadId.mockResolvedValue([]);
    mockChatThreadsRepository.findById.mockResolvedValue({
      id: 'thread-1',
      userId: 'user-1',
      systemPrompt: null,
      temperature: null,
      maxTokens: null,
      contextPackIds: [],
    });
    mockContextAssemblyManager.assemble.mockResolvedValue(mockContext);
    mockChatStreamService.emitCompletion.mockImplementation(() => {});
    mockChatStreamService.emitError.mockImplementation(() => {});

    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });
    manager = new EscalationChainManager(
      mockChatExecutionManager as any,
      mockContextAssemblyManager as any,
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockQualityCheckManager as any,
      mockResearchEnricherManager as any,
    );
  });

  describe('executeEscalationChain', () => {
    it('should return messageId immediately without waiting for background', async () => {
      mockChatExecutionManager.callProvider.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(buildLlmResponse('OPENAI', 'gpt-4o-mini')), 100),
          ),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      const start = Date.now();
      const result = await manager.executeEscalationChain(
        'user-1',
        'thread-1',
        'test prompt',
        twoStepChain,
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(result.messageId).toBe('msg-1');
      expect(result.threadId).toBe('thread-1');
      expect(result.prompt).toBe('test prompt');
    });

    it('should store user message before returning', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'hello', twoStepChain);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'USER', content: 'hello' }),
      );
    });
  });

  describe('background escalation logic', () => {
    it('should not escalate when step 1 passes and store a single result message', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Great response from step 1'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 1 user message + 1 result message
      expect(mockChatMessagesRepository.create).toHaveBeenCalledTimes(2);
      // callProvider called only once (step 1 passed)
      expect(mockChatExecutionManager.callProvider).toHaveBeenCalledTimes(1);
    });

    it('should escalate to step 2 when step 1 quality is below threshold', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak response'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Strong response'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.3, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.8, isWeak: false, reasons: [] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatExecutionManager.callProvider).toHaveBeenCalledTimes(2);
      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.escalated).toBe(true);
      expect(resultCall[0].metadata.stepUsed).toBe(2);
    });

    it('should have SINGLE_STEP status when chain has 2 steps and step 1 passes', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Good response'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.status).toBe(EscalationChainStatus.SINGLE_STEP);
      expect(resultCall[0].metadata.escalated).toBe(false);
    });

    it('should have RESOLVED_AT_STEP status when chain has 3 steps and step 2 passes', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak'))
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o', 'Better response here'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.2, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.75, isWeak: false, reasons: [] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', threeStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.status).toBe(EscalationChainStatus.RESOLVED_AT_STEP);
      expect(resultCall[0].metadata.stepUsed).toBe(2);
      expect(resultCall[0].metadata.escalated).toBe(true);
    });

    it('should have EXHAUSTED status when all steps fail quality check', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak 1'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Weak 2'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.2, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.3, isWeak: true, reasons: ['response_too_short'] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.status).toBe(EscalationChainStatus.EXHAUSTED);
      expect(resultCall[0].metadata.stepUsed).toBe(2);
    });

    it('should store result message with escalationChain: true in metadata', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Response content'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.8,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.escalationChain).toBe(true);
      expect(resultCall[0].metadata.stepResults).toBeDefined();
      expect(Array.isArray(resultCall[0].metadata.stepResults)).toBe(true);
    });

    it('should call emitCompletion after successful chain execution', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Good response'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatStreamService.emitCompletion).toHaveBeenCalledWith(
        'thread-1',
        'OPENAI',
        'gpt-4o-mini',
      );
    });

    it('should call emitError and store error message when background fails entirely', async () => {
      mockChatMessagesRepository.create
        .mockResolvedValueOnce({ id: 'user-msg-1' })
        .mockRejectedValueOnce(new Error('DB failure'));

      mockChatExecutionManager.callProvider.mockResolvedValue(
        buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Response'),
      );
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatStreamService.emitError).toHaveBeenCalled();
    });

    it('EXHAUSTED: finalProvider and finalModel come from the last step in the chain', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak 1'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Weak 2'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.1, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.2, isWeak: true, reasons: ['response_too_short'] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      // twoStepChain last step is ANTHROPIC / claude-sonnet-4
      expect(resultCall[0].metadata.finalProvider).toBe('ANTHROPIC');
      expect(resultCall[0].metadata.finalModel).toBe('claude-sonnet-4');
    });

    it('EXHAUSTED: selectBestAnswer picks the step with the highest quality score', async () => {
      // Step 1 scores 0.3, step 2 scores 0.4 — both fail threshold but step 2 is "best"
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Low quality answer'))
        .mockResolvedValueOnce(
          buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Slightly better answer'),
        );

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.3, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.4, isWeak: true, reasons: ['response_too_short'] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].content).toBe('Slightly better answer');
      expect(resultCall[0].metadata.status).toBe(EscalationChainStatus.EXHAUSTED);
    });

    it('EXHAUSTED: selectBestAnswer returns fallback message when all steps produce errors (content=null)', async () => {
      // Both steps throw (LLM errors) — content will be null in stepResults
      mockChatExecutionManager.callProvider
        .mockRejectedValueOnce(new Error('Provider 1 error'))
        .mockRejectedValueOnce(new Error('Provider 2 error'));

      // Quality check is never called for failed steps — but set up as safety net
      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0,
        isWeak: true,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      // selectBestAnswer fallback message when no successful steps exist
      expect(resultCall[0].content).toBe('All escalation steps failed to produce a valid response');
      expect(resultCall[0].metadata.status).toBe(EscalationChainStatus.EXHAUSTED);
    });

    it('should store stepResults array with one entry per step executed', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Strong'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.2, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.85, isWeak: false, reasons: [] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.stepResults).toHaveLength(2);
      expect(resultCall[0].metadata.stepResults[0].step).toBe(1);
      expect(resultCall[0].metadata.stepResults[0].passed).toBe(false);
      expect(resultCall[0].metadata.stepResults[1].step).toBe(2);
      expect(resultCall[0].metadata.stepResults[1].passed).toBe(true);
    });

    it('should record errorMessage in stepResult when a step LLM call throws', async () => {
      mockChatExecutionManager.callProvider
        .mockRejectedValueOnce(new Error('LLM provider timeout'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-sonnet-4', 'Recovered'));

      mockQualityCheckManager.checkResponseQuality.mockReturnValue({
        score: 0.9,
        isWeak: false,
        reasons: [],
      });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', twoStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.stepResults[0].errorMessage).toBe('LLM provider timeout');
      expect(resultCall[0].metadata.stepResults[0].content).toBeNull();
      expect(resultCall[0].metadata.stepResults[0].qualityScore).toBe(0);
      expect(resultCall[0].metadata.stepResults[0].passed).toBe(false);
    });

    it('RESOLVED_AT_STEP: escalated flag is true when resolution happens at step 2+', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o-mini', 'Weak'))
        .mockResolvedValueOnce(buildLlmResponse('OPENAI', 'gpt-4o', 'Good enough'))
        .mockResolvedValueOnce(buildLlmResponse('ANTHROPIC', 'claude-opus-4', 'Never reached'));

      mockQualityCheckManager.checkResponseQuality
        .mockReturnValueOnce({ score: 0.2, isWeak: true, reasons: ['response_too_short'] })
        .mockReturnValueOnce({ score: 0.8, isWeak: false, reasons: [] });

      await manager.executeEscalationChain('user-1', 'thread-1', 'prompt', threeStepChain);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only call provider twice (stops at step 2)
      expect(mockChatExecutionManager.callProvider).toHaveBeenCalledTimes(2);

      const resultCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.escalationChain === true,
      );
      expect(resultCall).toBeDefined();
      expect(resultCall[0].metadata.escalated).toBe(true);
      expect(resultCall[0].metadata.totalSteps).toBe(3);
      expect(resultCall[0].metadata.stepUsed).toBe(2);
    });
  });
});
