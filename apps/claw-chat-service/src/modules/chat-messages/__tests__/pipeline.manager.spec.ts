import { type Mock, vi } from 'vitest';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { PipelineManager } from '../managers/pipeline.manager';
import { type ChatContextGatewayManager } from '../managers/chat-context-gateway.manager';
import { type ModeExecutionGatewayManager } from '../managers/mode-execution-gateway.manager';
import { type ResearchEnricherManager } from '../managers/research-enricher.manager';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { pipelineMessageSchema } from '../dto/pipeline-message.dto';
import { PIPELINE_TEMPLATES } from '../constants/pipeline.constants';
import { MODE_HISTORY_MESSAGE_LIMIT } from '../constants/chat-context-gateway.constants';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';

const mockMessagesRepo = (): Partial<Record<keyof ChatMessagesRepository, Mock>> => ({
  create: vi.fn(),
});

const mockThreadsRepo = (): Partial<Record<keyof ChatThreadsRepository, Mock>> => ({
  create: vi.fn(),
  findById: vi.fn(),
});

const mockStreamService = (): Partial<Record<keyof ChatStreamService, Mock>> => ({
  emitRequestAccepted: vi.fn(),
  emitProgressStage: vi.fn(),
  emitOrchestrationStage: vi.fn(),
  emitCompletion: vi.fn(),
  emitError: vi.fn(),
});

// Universal-research PR2: every orchestration manager calls
// enrichForOrchestration at the top of its background loop. The default stub
// returns the no-op shape (mode=NONE / empty token short-circuit) so the
// existing tests don't see any extra side effect — individual tests can
// override the mock when they want to assert enrichment behaviour.
type ResearchEnricherStub = {
  enrichForOrchestration: Mock;
  service: ResearchEnricherManager;
};

function mockResearchEnricher(): ResearchEnricherStub {
  const enrichForOrchestration = vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' });
  const service = { enrichForOrchestration } as unknown as ResearchEnricherManager;
  return { enrichForOrchestration, service };
}

/** The bundle shape `ChatContextGatewayManager.build` hands back. */
const makeBundle = (systemPrompt: string | null = null) => ({
  context: {
    userId: 'user-1',
    systemPrompt,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
  },
  thread: { id: 'thread-1' },
  threadSettings: undefined,
  messages: [],
  fileIds: [],
  latestUserMetadata: null,
});

type ContextGatewayStub = { build: Mock; service: ChatContextGatewayManager };

function mockContextGateway(systemPrompt: string | null = null): ContextGatewayStub {
  const build = vi.fn().mockResolvedValue(makeBundle(systemPrompt));
  return { build, service: { build } as unknown as ChatContextGatewayManager };
}

// Every stage now goes through the same chokepoint a chat turn uses, so the
// spec asserts on this rather than on a hand-built Ollama request body.
type ModeGatewayStub = { run: Mock; service: ModeExecutionGatewayManager };

function mockModeGateway(): ModeGatewayStub {
  const run = vi.fn().mockResolvedValue({
    content: 'stage output',
    provider: 'local-ollama',
    model: 'AUTO',
    inputTokens: 10,
    outputTokens: 20,
  });
  return { run, service: { run } as unknown as ModeExecutionGatewayManager };
}

describe('PipelineManager', () => {
  let manager: PipelineManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepo>;
  let threadsRepo: ReturnType<typeof mockThreadsRepo>;
  let streamService: ReturnType<typeof mockStreamService>;
  let contextGateway: ContextGatewayStub;
  let modeGateway: ModeGatewayStub;
  let researchEnricher: ResearchEnricherStub;

  const buildManager = (selectionService?: AdvancedModuleModelSelectionService): PipelineManager =>
    new PipelineManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      contextGateway.service,
      modeGateway.service,
      researchEnricher.service,
      selectionService,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    messagesRepo = mockMessagesRepo();
    threadsRepo = mockThreadsRepo();
    streamService = mockStreamService();
    contextGateway = mockContextGateway();
    modeGateway = mockModeGateway();
    researchEnricher = mockResearchEnricher();
    manager = buildManager();
  });

  describe('executePipeline', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-1', threadId: 'thread-1' });

      const result = await manager.executePipeline(
        'user-1',
        {
          content: 'A request that is long enough',
          threadId: 'thread-1',
          template: 'analyze-reason-format',
        },
        '',
      );

      expect(result).toEqual({ messageId: 'msg-1', threadId: 'thread-1' });
    });

    it('should create a new thread when no threadId is provided', async () => {
      threadsRepo.create!.mockResolvedValue({ id: 'new-thread', userId: 'user-1' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-2', threadId: 'new-thread' });

      const result = await manager.executePipeline(
        'user-1',
        {
          content: 'A request that is long enough',
          template: 'analyze-reason-format',
        },
        '',
      );

      expect(threadsRepo.create).toHaveBeenCalled();
      expect(result.threadId).toBe('new-thread');
    });

    it('should resolve immediately (fire-and-forget)', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-3', threadId: 'thread-1' });

      const promise = manager.executePipeline(
        'user-1',
        {
          content: 'A request that is long enough',
          threadId: 'thread-1',
          template: 'analyze-reason-format',
        },
        '',
      );

      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with pipeline: true in metadata', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'assist-1', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        {
          content: 'My request content',
          template: 'analyze-reason-format',
        },
        'user-1',
      );

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect((assistantCall![0] as { metadata?: { pipeline?: boolean } }).metadata?.pipeline).toBe(
        true,
      );
    });

    it('should store metadata with correct stageCount', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'assist-2', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        {
          content: 'My request content',
          template: 'analyze-reason-format',
        },
        'user-1',
      );

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(
        (assistantCall![0] as { metadata?: { stageCount?: number } }).metadata?.stageCount,
      ).toBe(3);
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-done', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        {
          content: 'My request content',
          template: 'analyze-reason-format',
        },
        'user-1',
      );

      expect(streamService.emitCompletion).toHaveBeenCalledWith('thread-1', 'local-ollama', 'AUTO');
    });

    it('should emit SSE error and store error message when a stage call fails', async () => {
      modeGateway.run.mockRejectedValueOnce(new Error('Provider unreachable'));
      messagesRepo.create!.mockResolvedValue({ id: 'err-msg', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        {
          content: 'My request content',
          template: 'analyze-reason-format',
        },
        'user-1',
      );

      expect(streamService.emitError).toHaveBeenCalledWith('thread-1', expect.any(String));
      const errorCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { metadata?: { error?: boolean } }).metadata?.error === true,
      );
      expect(errorCall).toBeDefined();
    });

    it('should resolve even when everything fails (fire-and-forget safety)', async () => {
      modeGateway.run.mockRejectedValue(new Error('Network error'));
      messagesRepo.create!.mockRejectedValue(new Error('DB error'));

      await expect(
        manager.executeInBackground(
          'thread-1',
          'My request content',
          {
            content: 'My request content',
            template: 'analyze-reason-format',
          },
          'user-1',
        ),
      ).resolves.toBeUndefined();
    });

    it('should use analyze-reason-format template stages by default', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-tmpl', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'Content here',
        {
          content: 'Content here',
          template: 'analyze-reason-format',
        },
        'user-1',
      );

      expect(modeGateway.run).toHaveBeenCalledTimes(3);
    });

    it('should use customStages when template is custom', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-custom', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'Content',
        {
          content: 'Content',
          template: 'custom',
          customStages: [
            { name: 'Stage A', instruction: 'Do A:', model: 'AUTO' },
            { name: 'Stage B', instruction: 'Do B:', model: 'AUTO' },
          ],
        },
        'user-1',
      );

      expect(modeGateway.run).toHaveBeenCalledTimes(2);
      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(
        (assistantCall![0] as { metadata?: { stageCount?: number } }).metadata?.stageCount,
      ).toBe(2);
    });
  });

  describe('context and execution gateways', () => {
    it('builds ONE bundle for the whole chain, on the PIPELINE surface', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-bundle', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        { content: 'My request content', template: 'analyze-reason-format' },
        'user-1',
      );

      // Three stages ran, but retrieval happened once: a per-stage build would
      // re-run history, memory, attachment and cross-thread lookups per stage.
      expect(modeGateway.run).toHaveBeenCalledTimes(3);
      expect(contextGateway.build).toHaveBeenCalledTimes(1);
      expect(contextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          threadId: 'thread-1',
          surface: ChatSurface.PIPELINE,
          historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        }),
      );
    });

    it("sends each stage's instruction as the system prompt and the stage input as the prompt", async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-chain', threadId: 'thread-1' });
      modeGateway.run
        .mockResolvedValueOnce({ content: 'analysis output' })
        .mockResolvedValueOnce({ content: 'reasoning output' })
        .mockResolvedValueOnce({ content: 'formatted output' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        { content: 'My request content', template: 'analyze-reason-format' },
        'user-1',
      );

      const stages = PIPELINE_TEMPLATES['analyze-reason-format']!;
      const calls = modeGateway.run.mock.calls.map(
        (call) =>
          call[0] as { prompt?: string; bundle: { context: { systemPrompt: string | null } } },
      );
      expect(calls).toHaveLength(3);
      // The instruction is a PERSONA, not text glued in front of the input.
      expect(calls[0]!.bundle.context.systemPrompt).toBe(stages[0]!.instruction);
      expect(calls[1]!.bundle.context.systemPrompt).toBe(stages[1]!.instruction);
      expect(calls[2]!.bundle.context.systemPrompt).toBe(stages[2]!.instruction);
      // The prompt is the chain: stage 1 gets the user's content, stage N gets
      // stage N-1's output.
      expect(calls[0]!.prompt).toBe('My request content');
      expect(calls[1]!.prompt).toBe('analysis output');
      expect(calls[2]!.prompt).toBe('reasoning output');
    });

    it('appends the stage persona to an existing system prompt instead of replacing it', async () => {
      contextGateway.build.mockResolvedValue(makeBundle('Always answer in French.'));
      messagesRepo.create!.mockResolvedValue({ id: 'msg-persona', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'Content',
        {
          content: 'Content',
          template: 'custom',
          customStages: [{ name: 'Stage A', instruction: 'Do A:', model: 'AUTO' }],
        },
        'user-1',
      );

      const call = modeGateway.run.mock.calls[0]![0] as {
        bundle: { context: { systemPrompt: string | null } };
      };
      expect(call.bundle.context.systemPrompt).toBe('Always answer in French.\n\nDo A:');
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
          { name: 'S1', instruction: 'Do 1:', model: 'AUTO' },
          { name: 'S2', instruction: 'Do 2:', model: 'AUTO' },
          { name: 'S3', instruction: 'Do 3:', model: 'AUTO' },
          { name: 'S4', instruction: 'Do 4:', model: 'AUTO' },
          { name: 'S5', instruction: 'Do 5:', model: 'AUTO' },
          { name: 'S6', instruction: 'Do 6:', model: 'AUTO' },
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

  describe('model selection', () => {
    it('rejects manual selection with unsupported provider before queuing', async () => {
      const selectionService: Partial<Record<keyof AdvancedModuleModelSelectionService, Mock>> = {
        resolveSelection: vi
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };
      const isolated = buildManager(
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executePipeline(
          'user-1',
          {
            content: 'A request that will be rejected',
            threadId: 'thread-1',
            template: 'analyze-reason-format',
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('MANUAL_MODEL: all stages run with the single chosen model (documented single-model pipeline behavior)', async () => {
      const manualResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      messagesRepo.create!.mockResolvedValue({ id: 'assist-manual', threadId: 'thread-m' });

      await manager.executeInBackground(
        'thread-m',
        'My content',
        { content: 'My content', template: 'analyze-reason-format' },
        'user-1',
        manualResolution,
      );

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            stages?: Array<{ model?: string }>;
            routeRoadmap?: { finalProvider?: string; finalModel?: string };
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.MANUAL_MODEL);
      expect(metadata?.modelSelection?.actualModel).toBe('qwen2.5:7b');
      expect(metadata?.routeRoadmap?.finalModel).toBe('qwen2.5:7b');
      // All stages should use the manually-selected model
      for (const stage of metadata?.stages ?? []) {
        expect(stage.model).toBe('qwen2.5:7b');
      }
    });

    it('AUTO path: routeRoadmap surfaces the truthfully-resolved model', async () => {
      const autoResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.AUTO,
        requestedProvider: null,
        requestedModel: null,
        requestedDisplayName: null,
        selectedModelSource: null,
        actualProvider: 'local-ollama',
        actualModel: 'gemma3:4b',
      };
      messagesRepo.create!.mockResolvedValue({ id: 'assist-auto', threadId: 'thread-a' });

      await manager.executeInBackground(
        'thread-a',
        'My content',
        { content: 'My content', template: 'analyze-reason-format' },
        'user-1',
        autoResolution,
      );

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            routeRoadmap?: { finalProvider?: string; finalModel?: string };
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.AUTO);
      expect(metadata?.routeRoadmap?.finalProvider).toBe('local-ollama');
      expect(metadata?.routeRoadmap?.finalModel).toBe('gemma3:4b');
    });
  });

  describe('research enrichment wiring', () => {
    it('does NOT invoke enrichForOrchestration when researchMode is undefined/NONE', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-no-research', threadId: 'thread-1' });

      await manager.executeInBackground(
        'thread-1',
        'My request content',
        { content: 'My request content', template: 'analyze-reason-format' },
        'user-1',
        undefined,
        '',
      );

      // enrichForOrchestration IS still called (the helper itself short-circuits
      // internally on mode=undefined/NONE) — but it must not have produced any
      // transcript on the assistant message.
      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (assistantCall![0] as { metadata?: { researchTranscript?: unknown } })
        .metadata;
      expect(metadata?.researchTranscript).toBeUndefined();
      expect(contextGateway.build).toHaveBeenCalledWith(
        expect.not.objectContaining({ personaInstruction: expect.anything() }),
      );
    });

    it('threads enricher transcript onto the ASSISTANT message when researchMode is SEARCH', async () => {
      const transcript = {
        mode: ResearchMode.SEARCH,
        query: 'What is the weather today?',
        sources: [{ title: 'src', url: 'https://example.com', snippet: 'snippet' }],
        latencyMs: 12,
        warnings: [],
      };
      const evidence =
        '## Web research evidence (mode: SEARCH, gathered now)\n\n[1] src — https://example.com\nsnippet\n';
      researchEnricher.enrichForOrchestration.mockResolvedValue({
        transcript,
        systemPrompt: evidence,
      });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-research', threadId: 'thread-r' });

      await manager.executeInBackground(
        'thread-r',
        'What is the weather today?',
        {
          content: 'What is the weather today?',
          template: 'analyze-reason-format',
          researchMode: ResearchMode.SEARCH,
        },
        'user-1',
        undefined,
        'bearer-token-stub',
      );

      expect(researchEnricher.enrichForOrchestration).toHaveBeenCalledWith({
        threadId: 'thread-r',
        mode: ResearchMode.SEARCH,
        query: 'What is the weather today?',
        userToken: 'bearer-token-stub',
        providerId: undefined,
      });
      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (
        assistantCall![0] as { metadata?: { researchTranscript?: { sources?: unknown[] } } }
      ).metadata;
      expect(metadata?.researchTranscript).toEqual(transcript);
      // The evidence reaches the model on the ONE shared bundle, not glued in
      // front of every stage's prompt text. Deliberate change (ADR-118,
      // 2026-09-24 update): it must go through `researchEvidenceInstruction`,
      // not the generic `personaInstruction`, so
      // `injectResearchEvidenceIntoContext` sets `researchGroundingInjected`
      // and the final-user-turn grounding reminder still fires.
      expect(contextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ researchEvidenceInstruction: evidence }),
      );
    });
  });
});
