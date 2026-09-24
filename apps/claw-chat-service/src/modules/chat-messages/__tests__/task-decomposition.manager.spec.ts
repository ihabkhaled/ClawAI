import { type Mock, vi } from 'vitest';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { type ResearchEnricherManager } from '../managers/research-enricher.manager';
import { type ChatContextGatewayManager } from '../managers/chat-context-gateway.manager';
import { type ModeExecutionGatewayManager } from '../managers/mode-execution-gateway.manager';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { decomposeTaskSchema } from '../dto/decompose-task.dto';
import { PAYG_WORKFLOW_TASK_DECOMPOSITION } from '../constants/payg.constants';
import { TokenLedgerContext } from '@claw/shared-types';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';

// The original user turn. The whole point of the gateway migration is that a
// sub-task run can still see this; before it, a sub-task was sent as its bare
// instruction and the user's words never reached the model.
const ORIGINAL_USER_MESSAGE = {
  id: 'msg-user-original',
  threadId: 'thread-1',
  role: 'USER',
  content: 'Audit the config file in the billing service',
  metadata: null,
};

const makeBundle = (): ChatContextBundle =>
  ({
    context: {
      userId: 'user-1',
      systemPrompt: null,
      threadMessages: [ORIGINAL_USER_MESSAGE],
      memories: [],
      contextPackItems: [],
      fileContents: [],
      workspaceCitations: [],
      researchEvidence: [],
    },
    thread: { id: 'thread-1' },
    threadSettings: undefined,
    messages: [ORIGINAL_USER_MESSAGE],
    fileIds: [],
    latestUserMetadata: null,
  }) as unknown as ChatContextBundle;

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

type ResearchEnricherStub = {
  enrichForOrchestration: Mock;
  service: ResearchEnricherManager;
};

function mockResearchEnricher(): ResearchEnricherStub {
  const enrichForOrchestration = vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' });
  const service = { enrichForOrchestration } as unknown as ResearchEnricherManager;
  return { enrichForOrchestration, service };
}

const subTasksJson = (...titles: Array<{ title: string; instruction: string }>): string =>
  JSON.stringify(titles.map((t) => ({ ...t, category: 'general' })));

describe('TaskDecompositionManager', () => {
  let manager: TaskDecompositionManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepo>;
  let threadsRepo: ReturnType<typeof mockThreadsRepo>;
  let streamService: ReturnType<typeof mockStreamService>;
  let researchEnricher: ResearchEnricherStub;
  let contextGateway: { build: Mock };
  let executionGateway: { run: Mock };
  let bundle: ChatContextBundle;

  const build = (
    selectionService?: AdvancedModuleModelSelectionService,
  ): TaskDecompositionManager =>
    new TaskDecompositionManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      contextGateway as unknown as ChatContextGatewayManager,
      executionGateway as unknown as ModeExecutionGatewayManager,
      researchEnricher.service,
      selectionService,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    messagesRepo = mockMessagesRepo();
    threadsRepo = mockThreadsRepo();
    streamService = mockStreamService();
    researchEnricher = mockResearchEnricher();
    bundle = makeBundle();
    contextGateway = { build: vi.fn().mockResolvedValue(bundle) };
    // Planner hop, then one hop per sub-task, then the merge — all through the
    // one chokepoint chat uses, so the spec drives this instead of a hand-built
    // Ollama request body.
    executionGateway = { run: vi.fn().mockResolvedValue({ content: 'gateway answer' }) };
    manager = build();
  });

  describe('executeDecomposition', () => {
    it('should return messageId and threadId when threadId is provided', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-1', threadId: 'thread-1' });

      const result = await manager.executeDecomposition(
        'user-1',
        {
          content: 'A complex task with enough characters',
          threadId: 'thread-1',
          maxSubTasks: 3,
        },
        '',
      );

      expect(result).toEqual({ messageId: 'msg-1', threadId: 'thread-1' });
    });

    it('should create a new thread when no threadId is provided', async () => {
      threadsRepo.create!.mockResolvedValue({ id: 'new-thread', userId: 'user-1' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-2', threadId: 'new-thread' });

      const result = await manager.executeDecomposition(
        'user-1',
        {
          content: 'A complex task with enough characters',
          maxSubTasks: 2,
        },
        '',
      );

      expect(threadsRepo.create).toHaveBeenCalled();
      expect(result.threadId).toBe('new-thread');
    });

    it('should always resolve (fire-and-forget for background)', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-3', threadId: 'thread-1' });

      const promise = manager.executeDecomposition(
        'user-1',
        {
          content: 'A complex task with enough characters',
          threadId: 'thread-1',
          maxSubTasks: 3,
        },
        '',
      );

      await expect(promise).resolves.toBeDefined();
    });

    it('should store the user message in the repository', async () => {
      messagesRepo.create!.mockResolvedValue({ id: 'msg-4', threadId: 'thread-1' });

      await manager.executeDecomposition(
        'user-1',
        {
          content: 'A complex task to decompose and execute',
          threadId: 'thread-1',
          maxSubTasks: 3,
        },
        '',
      );

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
      executionGateway.run
        .mockResolvedValueOnce({
          content: subTasksJson(
            { title: 'Research', instruction: 'Do research' },
            { title: 'Write', instruction: 'Write report' },
          ),
        })
        .mockResolvedValueOnce({ content: 'Research result' })
        .mockResolvedValueOnce({ content: 'Writing result' })
        .mockResolvedValueOnce({ content: 'Merged final answer' });

      messagesRepo.create!.mockResolvedValue({ id: 'assist-1', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task', 3, 'user-1');

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect(
        (assistantCall![0] as { metadata?: { decomposed?: boolean } }).metadata?.decomposed,
      ).toBe(true);
      expect((assistantCall![0] as { content?: string }).content).toBe('Merged final answer');
    });

    it('should emit SSE error and store error message when the gateway call fails', async () => {
      executionGateway.run.mockRejectedValueOnce(new Error('provider refused'));
      messagesRepo.create!.mockResolvedValue({ id: 'err-msg', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task', 2, 'user-1');

      expect(streamService.emitError).toHaveBeenCalledWith('thread-1', 'provider refused');
      const errorCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { metadata?: { error?: boolean } }).metadata?.error === true,
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle JSON parse failure and fall back to single task', async () => {
      executionGateway.run
        .mockResolvedValueOnce({ content: 'not valid json at all' })
        .mockResolvedValueOnce({ content: 'Single task result' })
        .mockResolvedValueOnce({ content: 'Final merged answer' });

      messagesRepo.create!.mockResolvedValue({ id: 'msg-fallback', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task content', 3, 'user-1');

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      expect(
        (assistantCall![0] as { metadata?: { decomposed?: boolean } }).metadata?.decomposed,
      ).toBe(true);
      // Planner + one fallback sub-task + merge.
      expect(executionGateway.run).toHaveBeenCalledTimes(3);
    });

    it('should emit SSE completion on success', async () => {
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'Task', instruction: 'Do it' }) })
        .mockResolvedValueOnce({ content: 'result' })
        .mockResolvedValueOnce({ content: 'merged' });

      messagesRepo.create!.mockResolvedValue({ id: 'msg-done', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task content here', 2, 'user-1');

      expect(streamService.emitCompletion).toHaveBeenCalledWith('thread-1', 'local-ollama', 'AUTO');
    });
  });

  describe('shared context bundle', () => {
    it('builds ONE DECOMPOSE bundle and gives every sub-task the original conversation', async () => {
      executionGateway.run
        .mockResolvedValueOnce({
          content: subTasksJson(
            { title: 'Find it', instruction: 'check the config file' },
            { title: 'Explain it', instruction: 'summarise the findings' },
          ),
        })
        .mockResolvedValueOnce({ content: 'sub one' })
        .mockResolvedValueOnce({ content: 'sub two' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-bundle', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Complex task content here', 2, 'user-1');

      // One bundle for planner + both sub-tasks + merge, not one per hop.
      expect(contextGateway.build).toHaveBeenCalledTimes(1);
      expect(contextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          threadId: 'thread-1',
          surface: 'DECOMPOSE',
          historyLimit: 20,
        }),
      );
      expect(executionGateway.run).toHaveBeenCalledTimes(4);

      // The defect this migration fixes: a sub-task used to be sent as its bare
      // instruction, so "check the config file" reached a model that had never
      // seen the user's question. It now rides on the shared bundle.
      const subTaskCalls = executionGateway.run.mock.calls.slice(1, 3);
      for (const [request] of subTaskCalls) {
        const typed = request as { bundle: ChatContextBundle; prompt?: string };
        expect(typed.bundle).toBe(bundle);
        expect(typed.bundle.context.threadMessages).toContain(ORIGINAL_USER_MESSAGE);
      }
      expect((subTaskCalls[0]![0] as { prompt?: string }).prompt).toBe('check the config file');
      expect((subTaskCalls[1]![0] as { prompt?: string }).prompt).toBe('summarise the findings');
    });

    it('sends the decomposition framing as a persona, not as prompt text', async () => {
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-persona', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Audit the billing config', 3, 'user-1');

      const plannerRequest = executionGateway.run.mock.calls[0]![0] as {
        bundle: ChatContextBundle;
        prompt?: string;
      };
      expect(plannerRequest.bundle.context.systemPrompt).toContain(
        'You are a task decomposition assistant',
      );
      // The user's own words are the prompt, not a string interpolated into a
      // hardcoded template.
      expect(plannerRequest.prompt).toBe('Audit the billing config');
      // The persona is appended locally; the shared bundle is left untouched so
      // the sub-tasks do not inherit the planner's rubric.
      expect(bundle.context.systemPrompt).toBeNull();
    });

    it('passes the enricher transcript as researchEvidenceInstruction on the bundle', async () => {
      researchEnricher.enrichForOrchestration.mockResolvedValue({
        transcript: null,
        systemPrompt: '## Web research evidence',
      });
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-evidence', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Some complex task', 2, 'user-1');

      // Deliberate change (ADR-118, 2026-09-24 update): the pre-fix shape
      // merged research evidence in via the generic `personaInstruction`
      // field, which never set `researchGroundingInjected` and silently
      // dropped the final-user-turn grounding reminder. It must now go
      // through `researchEvidenceInstruction`, the only field routed through
      // `injectResearchEvidenceIntoContext`.
      expect(contextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ researchEvidenceInstruction: '## Web research evidence' }),
      );
    });

    it('meters every hop on the task-decomposition ledger context', async () => {
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-ledger', threadId: 'thread-1' });

      await manager.executeInBackground('thread-1', 'Some complex task', 2, 'user-1');

      for (const [request] of executionGateway.run.mock.calls) {
        const typed = request as {
          ledgerContext: string;
          paygCall?: { workflow: string; requestId: string };
        };
        expect(typed.ledgerContext).toBe(TokenLedgerContext.TASK_DECOMPOSITION);
        expect(typed.paygCall?.workflow).toBe(PAYG_WORKFLOW_TASK_DECOMPOSITION);
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
      const isolated = build(selectionService as unknown as AdvancedModuleModelSelectionService);

      await expect(
        isolated.executeDecomposition(
          'user-1',
          {
            content: 'A complex task with enough characters',
            threadId: 'thread-1',
            maxSubTasks: 2,
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
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
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub-result' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-manual', threadId: 'thread-m' });

      await manager.executeInBackground(
        'thread-m',
        'Some complex task',
        2,
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
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub-result' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-auto', threadId: 'thread-a' });

      await manager.executeInBackground('thread-a', 'Some complex task', 2, 'user-1');

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

  describe('research enrichment wiring', () => {
    it('does NOT thread researchTranscript into metadata when researchMode is undefined', async () => {
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-no-research', threadId: 'thread-n' });

      await manager.executeInBackground(
        'thread-n',
        'Some complex task',
        2,
        'user-1',
        undefined,
        undefined,
        undefined,
        '',
      );

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (assistantCall![0] as { metadata?: { researchTranscript?: unknown } })
        .metadata;
      expect(metadata?.researchTranscript).toBeUndefined();
    });

    it('threads the enricher transcript onto the ASSISTANT message when researchMode is SEARCH', async () => {
      const transcript = {
        mode: ResearchMode.SEARCH,
        query: 'Some complex task',
        sources: [{ title: 'Wiki', url: 'https://wiki.example.com', snippet: 'snippet' }],
        latencyMs: 50,
        warnings: [],
      };
      researchEnricher.enrichForOrchestration.mockResolvedValue({
        transcript,
        systemPrompt:
          '## Web research evidence (mode: SEARCH, gathered now)\n\n[1] Wiki — https://wiki.example.com\nsnippet\n',
      });
      executionGateway.run
        .mockResolvedValueOnce({ content: subTasksJson({ title: 'T', instruction: 'do' }) })
        .mockResolvedValueOnce({ content: 'sub' })
        .mockResolvedValueOnce({ content: 'merged' });
      messagesRepo.create!.mockResolvedValue({ id: 'msg-research', threadId: 'thread-r' });

      await manager.executeInBackground(
        'thread-r',
        'Some complex task',
        2,
        'user-1',
        undefined,
        ResearchMode.SEARCH,
        undefined,
        'bearer-stub',
      );

      expect(researchEnricher.enrichForOrchestration).toHaveBeenCalledWith({
        threadId: 'thread-r',
        mode: ResearchMode.SEARCH,
        query: 'Some complex task',
        userToken: 'bearer-stub',
        providerId: undefined,
      });
      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (
        assistantCall![0] as { metadata?: { researchTranscript?: { sources?: unknown[] } } }
      ).metadata;
      expect(metadata?.researchTranscript).toEqual(transcript);
    });
  });
});
