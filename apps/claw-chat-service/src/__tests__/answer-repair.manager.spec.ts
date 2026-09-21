import { vi } from 'vitest';
import { AppConfig } from '../app/config/app.config';
import { BusinessException } from '../common/errors';
import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { AnswerRepairManager } from '../modules/chat-messages/managers/answer-repair.manager';
import { RepairType } from '../common/enums/repair-type.enum';
import { repairMessageSchema } from '../modules/chat-messages/dto/repair-message.dto';
import { ChatSurface } from '../common/enums/chat-surface.enum';
import { TokenLedgerContext } from '@claw/shared-types';
import { PAYG_WORKFLOW_ANSWER_REPAIR } from '../modules/chat-messages/constants/payg.constants';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

vi.spyOn(AppConfig, 'get').mockReturnValue({
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

// A real conversation, so the spec can prove the repair call receives it rather
// than just the answer text — the defect this migration removes.
const THREAD_MESSAGES = [
  { id: 'q-1', threadId: 'thread-1', role: 'USER', content: 'What is our refund window?' },
  { id: 'a-1', threadId: 'thread-1', role: 'ASSISTANT', content: 'Thirty days.' },
];

const buildBundle = () => ({
  context: {
    userId: 'user-1',
    systemPrompt: null as string | null,
    threadMessages: [...THREAD_MESSAGES],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
  },
  thread: { id: 'thread-1' },
  threadSettings: undefined,
  messages: [...THREAD_MESSAGES],
  fileIds: [],
  latestUserMetadata: null,
});

const mockChatContextGateway = {
  build: vi.fn(async () => buildBundle()),
};

// The repair hop now goes through the same chokepoint a chat turn uses, so the
// spec asserts on this rather than on a hand-built Ollama request body.
const mockModeExecutionGateway = {
  run: vi.fn(async () => ({
    content: 'Repaired content',
    provider: 'local-ollama',
    model: 'AUTO',
    inputTokens: 10,
    outputTokens: 20,
  })),
};

describe('AnswerRepairManager', () => {
  let manager: AnswerRepairManager;

  const mockChatMessagesRepository = {
    create: vi.fn(),
    findById: vi.fn(),
  };

  const mockChatThreadsRepository = {
    findById: vi.fn(),
    create: vi.fn(),
  };

  const mockChatStreamService = {
    emitCompletion: vi.fn(),
    emitError: vi.fn(),
  };

  // Universal-research PR2: orchestration managers now take a
  // ResearchEnricherManager. Default stub returns the no-op shape so existing
  // tests don't accidentally invoke web-research.
  const mockResearchEnricherManager = {
    enrichForOrchestration: vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
  };

  const buildManager = (
    overrides: {
      messages?: typeof mockChatMessagesRepository;
      stream?: typeof mockChatStreamService;
      selectionService?: unknown;
    } = {},
  ): AnswerRepairManager =>
    new AnswerRepairManager(
      (overrides.messages ?? mockChatMessagesRepository) as any,
      mockChatThreadsRepository as any,
      (overrides.stream ?? mockChatStreamService) as any,
      mockChatContextGateway as any,
      mockModeExecutionGateway as any,
      mockResearchEnricherManager as any,
      overrides.selectionService as any,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });
    mockChatContextGateway.build.mockResolvedValue(buildBundle());
    mockModeExecutionGateway.run.mockResolvedValue({
      content: 'Repaired content',
      provider: 'local-ollama',
      model: 'AUTO',
      inputTokens: 10,
      outputTokens: 20,
    });
    manager = buildManager();
  });

  describe('executeRepair', () => {
    it('happy path: repair with FORMAT type queues background task and returns messageId/threadId', async () => {
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-1' });

      const result = await manager.executeRepair(
        'user-1',
        {
          content: 'Some poorly formatted answer',
          threadId: 'thread-1',
          repairTypes: [RepairType.FORMAT],
        },
        '',
      );

      expect(result.messageId).toBe('msg-1');
      expect(result.threadId).toBe('thread-1');
      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 'thread-1', role: 'USER' }),
      );
    });

    it('happy path: repair with multiple types passes all types through', async () => {
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-2' });

      const result = await manager.executeRepair(
        'user-1',
        {
          content: 'Incomplete schema with bad formatting',
          threadId: 'thread-2',
          repairTypes: [RepairType.SCHEMA, RepairType.FORMAT, RepairType.COMPLETENESS],
        },
        '',
      );

      expect(result.threadId).toBe('thread-2');
    });

    it('creates a new thread when no threadId is provided', async () => {
      mockChatThreadsRepository.create.mockResolvedValue({ id: 'new-thread-1' });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-3' });

      const result = await manager.executeRepair(
        'user-1',
        {
          content: 'Some content to repair',
          repairTypes: [RepairType.COMPLETENESS],
        },
        '',
      );

      expect(mockChatThreadsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.threadId).toBe('new-thread-1');
    });

    it('resolves content from messageId when content is not provided', async () => {
      mockChatMessagesRepository.findById.mockResolvedValue({
        id: 'existing-msg',
        content: 'Original message content',
      });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-4' });

      const result = await manager.executeRepair(
        'user-1',
        {
          messageId: 'existing-msg',
          threadId: 'thread-3',
          repairTypes: [RepairType.FACTUALITY],
        },
        '',
      );

      expect(mockChatMessagesRepository.findById).toHaveBeenCalledWith('existing-msg');
      expect(result.messageId).toBe('msg-4');
    });
  });

  describe('context bundle', () => {
    it('repairs WITH the conversation: the gateway receives the bundle, not just the answer text', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-ctx' })
        .mockResolvedValueOnce({ id: 'a-ctx' });

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Thirty days.',
          threadId: 'thread-1',
          repairTypes: [RepairType.COMPLETENESS],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatContextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          threadId: 'thread-1',
          surface: ChatSurface.REPAIR,
          historyLimit: 20,
        }),
      );
      const call = (mockModeExecutionGateway.run as any).mock.calls[0]?.[0];
      // The whole point: the repairer sees the question the answer was answering.
      expect(call.bundle.context.threadMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: 'What is our refund window?' }),
        ]),
      );
      // …and the content being repaired is the prompt, appended, not a
      // concatenation glued in front of the rubric.
      expect(call.prompt).toBe('Thirty days.');
      expect(call.ledgerContext).toBe(TokenLedgerContext.REPAIR);
      expect(call.paygCall.workflow).toBe(PAYG_WORKFLOW_ANSWER_REPAIR);
    });

    it('windows the history at the message being repaired', async () => {
      mockChatMessagesRepository.findById.mockResolvedValue({
        id: 'a-1',
        content: 'Thirty days.',
      });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'u-win' });

      await manager.executeRepair(
        'user-1',
        {
          messageId: 'a-1',
          threadId: 'thread-1',
          repairTypes: [RepairType.FACTUALITY],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatContextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ routedMessageId: 'a-1' }),
      );
    });

    it('appends the repair rubric to the system prompt instead of replacing it', async () => {
      mockChatContextGateway.build.mockResolvedValue({
        ...buildBundle(),
        context: { ...buildBundle().context, systemPrompt: 'You are terse.' },
      });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'u-persona' });

      await manager.executeRepair(
        'user-1',
        {
          content: 'Thirty days.',
          threadId: 'thread-1',
          repairTypes: [RepairType.FORMAT],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      const call = (mockModeExecutionGateway.run as any).mock.calls[0]?.[0];
      expect(call.bundle.context.systemPrompt).toContain('You are terse.');
      expect(call.bundle.context.systemPrompt).toContain('FORMAT');
    });

    it('passes the research transcript as a persona instruction, not glued to the prompt', async () => {
      mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
        transcript: { steps: [] },
        systemPrompt: 'Evidence: refunds are 45 days.',
      });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'u-res' });

      await manager.executeRepair(
        'user-1',
        {
          content: 'Thirty days.',
          threadId: 'thread-1',
          repairTypes: [RepairType.FACTUALITY],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatContextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ personaInstruction: 'Evidence: refunds are 45 days.' }),
      );
      const call = (mockModeExecutionGateway.run as any).mock.calls[0]?.[0];
      expect(call.prompt).toBe('Thirty days.');
    });
  });

  describe('buildRepairPersona', () => {
    it('includes SCHEMA instruction when SCHEMA type is requested', () => {
      const persona = manager.buildRepairPersona([RepairType.SCHEMA]);
      expect(persona).toContain('SCHEMA');
      expect(persona).toContain('JSON');
    });

    it('includes FORMAT instruction when FORMAT type is requested', () => {
      const persona = manager.buildRepairPersona([RepairType.FORMAT]);
      expect(persona).toContain('FORMAT');
      expect(persona).toContain('markdown');
    });

    it('includes COMPLETENESS instruction when COMPLETENESS type is requested', () => {
      const persona = manager.buildRepairPersona([RepairType.COMPLETENESS]);
      expect(persona).toContain('COMPLETENESS');
      expect(persona).toContain('incomplete');
    });

    it('includes FACTUALITY instruction when FACTUALITY type is requested', () => {
      const persona = manager.buildRepairPersona([RepairType.FACTUALITY]);
      expect(persona).toContain('FACTUALITY');
      expect(persona).toContain('factual');
    });

    it('includes all instructions when all repair types are requested', () => {
      const persona = manager.buildRepairPersona([
        RepairType.SCHEMA,
        RepairType.FORMAT,
        RepairType.COMPLETENESS,
        RepairType.FACTUALITY,
      ]);
      expect(persona).toContain('SCHEMA');
      expect(persona).toContain('FORMAT');
      expect(persona).toContain('COMPLETENESS');
      expect(persona).toContain('FACTUALITY');
    });

    it('ends with instruction to return only the repaired answer', () => {
      const persona = manager.buildRepairPersona([RepairType.FORMAT]);
      expect(persona).toContain('Return ONLY the repaired answer');
    });

    it('no longer carries a copy of the answer — that is the prompt turn now', () => {
      const persona = manager.buildRepairPersona([RepairType.FORMAT]);
      expect(persona).not.toContain('Original answer to repair');
    });
  });

  describe('executeRepair — background task behavior', () => {
    it('stores ASSISTANT message with repaired metadata on success', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'user-msg' })
        .mockResolvedValueOnce({ id: 'assistant-msg' });

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Original answer',
          threadId: 'thread-bg',
          repairTypes: [RepairType.FORMAT],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenCalledTimes(2);
      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ repaired: true }),
        }),
      );
    });

    it('emits SSE completion after successful repair', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-1' })
        .mockResolvedValueOnce({ id: 'a-1' });
      const streamMock = { emitCompletion: vi.fn(), emitError: vi.fn() };

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
        stream: streamMock as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Answer',
          threadId: 'thread-sse',
          repairTypes: [RepairType.SCHEMA],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitCompletion).toHaveBeenCalledWith(
        'thread-sse',
        expect.any(String),
        expect.any(String),
      );
    });

    it('stores repairTypes in ASSISTANT metadata correctly', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-2' })
        .mockResolvedValueOnce({ id: 'a-2' });

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Text',
          threadId: 'thread-meta',
          repairTypes: [RepairType.COMPLETENESS, RepairType.FACTUALITY],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            repairTypes: [RepairType.COMPLETENESS, RepairType.FACTUALITY],
          }),
        }),
      );
    });

    it('emits SSE error then stores error message when the execution gateway fails', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-3' })
        .mockResolvedValueOnce({ id: 'err-msg' });
      const streamMock = { emitCompletion: vi.fn(), emitError: vi.fn() };
      mockModeExecutionGateway.run.mockRejectedValue(new Error('provider unavailable'));

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
        stream: streamMock as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Content',
          threadId: 'thread-fail',
          repairTypes: [RepairType.FORMAT],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitError).toHaveBeenCalledWith(
        'thread-fail',
        expect.stringContaining('repair failed'),
      );
      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ error: true }),
        }),
      );
    });

    it('executeRepair always resolves even when the background call fails (fire-and-forget)', async () => {
      const createMock = vi.fn().mockResolvedValueOnce({ id: 'u-4' }).mockResolvedValue({
        id: 'err-4',
      });
      mockModeExecutionGateway.run.mockRejectedValue(new Error('provider unavailable'));

      await expect(
        buildManager({
          messages: { ...mockChatMessagesRepository, create: createMock } as any,
          stream: { emitCompletion: vi.fn(), emitError: vi.fn() } as any,
        }).executeRepair(
          'user-1',
          {
            content: 'test',
            threadId: 'thread-ff',
            repairTypes: [RepairType.SCHEMA],
          },
          '',
        ),
      ).resolves.toMatchObject({ messageId: 'u-4', threadId: 'thread-ff' });
    });

    it('throws from resolveOriginalContent when messageId not found', async () => {
      mockChatMessagesRepository.findById.mockResolvedValue(null);

      await expect(
        manager.executeRepair(
          'user-1',
          {
            messageId: 'non-existent-msg',
            threadId: 'thread-x',
            repairTypes: [RepairType.FORMAT],
          },
          '',
        ),
      ).rejects.toThrow('Could not resolve original content to repair');
    });

    it('throws when the model returns an empty response string', async () => {
      const createMock = vi.fn().mockResolvedValueOnce({ id: 'u-5' }).mockResolvedValue({
        id: 'err-5',
      });
      const streamMock = { emitCompletion: vi.fn(), emitError: vi.fn() };
      mockModeExecutionGateway.run.mockResolvedValue({
        content: '   ',
        provider: 'local-ollama',
        model: 'AUTO',
      } as any);

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
        stream: streamMock as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Something',
          threadId: 'thread-empty',
          repairTypes: [RepairType.COMPLETENESS],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitError).toHaveBeenCalledWith(
        'thread-empty',
        expect.stringContaining('empty'),
      );
    });

    it('uses the requested local model in ASSISTANT metadata when provided', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-6' })
        .mockResolvedValueOnce({ id: 'a-6' });

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Text to fix',
          threadId: 'thread-model',
          repairTypes: [RepairType.SCHEMA],
          targetProvider: 'local-ollama',
          targetModel: 'qwen2.5:7b',
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          provider: 'local-ollama',
          model: 'qwen2.5:7b',
          metadata: expect.objectContaining({
            repairProvider: 'local-ollama',
            repairModel: 'qwen2.5:7b',
          }),
        }),
      );
    });

    it('rejects unsupported manual providers before queuing a repair request', async () => {
      const selectionService = {
        resolveSelection: vi
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };

      await expect(
        buildManager({ selectionService }).executeRepair(
          'user-1',
          {
            content: 'Text to fix',
            threadId: 'thread-invalid',
            repairTypes: [RepairType.FORMAT],
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
          },
          '',
        ),
      ).rejects.toThrow('unsupported provider');
      expect(mockChatMessagesRepository.create).not.toHaveBeenCalled();
    });

    it('stores model-selection metadata for manual repair execution', async () => {
      const manualSelection: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      const createMock = vi.fn().mockResolvedValue({ id: 'a-8' });
      const isolatedManager = buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      });

      await (isolatedManager as any).executeInBackground(
        'thread-manual',
        'Text to fix',
        [RepairType.FORMAT],
        'user-1',
        manualSelection,
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'qwen2.5:7b',
          metadata: expect.objectContaining({
            modelSelection: expect.objectContaining({
              actualModel: 'qwen2.5:7b',
              requestedModel: 'qwen2.5:7b',
            }),
          }),
        }),
      );
    });

    it('defaults to local-ollama/AUTO when no targetProvider/targetModel given', async () => {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'u-7' })
        .mockResolvedValueOnce({ id: 'a-7' });

      await buildManager({
        messages: { ...mockChatMessagesRepository, create: createMock } as any,
      }).executeRepair(
        'user-1',
        {
          content: 'Plain text',
          threadId: 'thread-default',
          repairTypes: [RepairType.FORMAT],
        },
        '',
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          provider: 'local-ollama',
          model: 'AUTO',
        }),
      );
    });
  });

  describe('DTO validation', () => {
    it('accepts valid input with content and repairTypes', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some answer to repair',
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid input with messageId and repairTypes', () => {
      const result = repairMessageSchema.safeParse({
        messageId: 'msg-abc',
        repairTypes: [RepairType.SCHEMA],
      });
      expect(result.success).toBe(true);
    });

    it('rejects input when neither messageId nor content is provided', () => {
      const result = repairMessageSchema.safeParse({
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('rejects input with empty repairTypes array', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects input with more than 4 repair types', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [
          RepairType.FORMAT,
          RepairType.SCHEMA,
          RepairType.COMPLETENESS,
          RepairType.FACTUALITY,
          RepairType.FORMAT,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('accepts all 4 repair types simultaneously', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [
          RepairType.SCHEMA,
          RepairType.FORMAT,
          RepairType.COMPLETENESS,
          RepairType.FACTUALITY,
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects unknown repairType enum value', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: ['INVALID_TYPE'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects content that exceeds 50000 characters', () => {
      const result = repairMessageSchema.safeParse({
        content: 'x'.repeat(50_001),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('accepts content at exactly 50000 characters', () => {
      const result = repairMessageSchema.safeParse({
        content: 'x'.repeat(50_000),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional threadId, targetProvider, targetModel fields', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [RepairType.SCHEMA],
        threadId: 'thread-123',
        targetProvider: 'anthropic',
        targetModel: 'claude-sonnet-4',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty string content', () => {
      const result = repairMessageSchema.safeParse({
        content: '',
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('rejects messageId exceeding 255 characters', () => {
      const result = repairMessageSchema.safeParse({
        messageId: 'x'.repeat(256),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });
  });
});
