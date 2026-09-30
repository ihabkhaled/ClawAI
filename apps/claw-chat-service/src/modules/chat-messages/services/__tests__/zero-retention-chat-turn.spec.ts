import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChatMessage, MessageRole } from '../../../../generated/prisma';
import { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import { RuntimeV2LoopManager } from '../../managers/runtime-v2-loop.manager';
import { ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../../repositories/runtime-v2.store';
import type { MessageRoutedData } from '../../types/execution.types';
import { AccessControlService } from '../access-control.service';
import { ChatMessagesService } from '../chat-messages.service';
import { RuntimeV2AccessService } from '../runtime-v2-access.service';
import { RuntimeV2RunService } from '../runtime-v2-run.service';
import { ZeroRetentionService } from '../zero-retention.service';

/**
 * F055 (a)/(b) on the service side: a zero-retention chat turn is marked when
 * it is created, answered normally, and purged once it has ended — answered or
 * failed. Without the header nothing about a turn changes. Usage is untouched:
 * token deduction lives at the execution chokepoint, which a purge never
 * reaches, and the completion event keeps every usage field.
 */
const thread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Existing title',
  routingMode: 'AUTO',
  judgeEnabled: false,
  criticEnabled: false,
};
function chatMessage(id: string, role: MessageRole, content: string): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role,
    content,
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
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    originalContent: null,
    editedAt: null,
  };
}
const userMessage = chatMessage('msg-1', MessageRole.USER, 'secret prompt');
const routed: MessageRoutedData = {
  messageId: 'msg-1',
  threadId: 'thread-1',
  selectedProvider: 'GEMINI',
  selectedModel: 'gemini-2.5-flash',
  routingMode: 'AUTO',
  timestamp: '2026-09-30T10:00:00.000Z',
};

/** Any collaborator the test does not care about: every method resolves to undefined. */
function inertDouble(): object {
  return new Proxy(
    {},
    {
      get: (_target, property) =>
        property === 'then' ? undefined : vi.fn().mockResolvedValue(undefined),
    },
  );
}

describe('ChatMessagesService with zero data retention', () => {
  const zeroRetention = {
    markChatTurn: vi.fn(async () => {}),
    isChatTurnMarked: vi.fn(async () => false),
    purgeChatTurn: vi.fn(async () => {}),
  };
  const publish = vi.fn().mockResolvedValue(undefined);
  const createUserMessage = vi.fn(async () => userMessage);
  let service: ChatMessagesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    zeroRetention.isChatTurnMarked.mockResolvedValue(false);
    const moduleReference = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
        { provide: ZeroRetentionService, useValue: zeroRetention },
        { provide: RabbitMQService, useValue: { publish } },
        {
          provide: ChatThreadsRepository,
          useValue: { findById: vi.fn(async () => thread) },
        },
        {
          provide: ChatMessagesRepository,
          useValue: { createUserMessageWithinDailyLimit: createUserMessage },
        },
        {
          provide: AccessControlService,
          useValue: { assertCanSendMessage: vi.fn(async () => null) },
        },
        {
          provide: RuntimeV2LoopManager,
          useValue: { tryHandleRouted: vi.fn(async () => false) },
        },
      ],
    })
      .useMocker(() => inertDouble())
      .compile();
    service = moduleReference.get(ChatMessagesService);
  });

  it('marks a turn whose request carried the header, before publishing it', async () => {
    await service.createMessage(
      'user-1',
      { threadId: 'thread-1', content: 'secret prompt' },
      't',
      true,
    );

    expect(zeroRetention.markChatTurn).toHaveBeenCalledWith('thread-1', 'msg-1');
    const markedAt = zeroRetention.markChatTurn.mock.invocationCallOrder[0] ?? Infinity;
    const created = publish.mock.calls.findIndex(
      ([pattern]) => pattern === EventPattern.MESSAGE_CREATED,
    );
    expect(publish.mock.invocationCallOrder[created] ?? 0).toBeGreaterThan(markedAt);
  });

  it('does not mark a turn without the header', async () => {
    await service.createMessage('user-1', { threadId: 'thread-1', content: 'hello' }, 't');

    expect(zeroRetention.markChatTurn).not.toHaveBeenCalled();
  });

  it('answers a marked turn with the flag set, then purges it', async () => {
    zeroRetention.isChatTurnMarked.mockResolvedValue(true);
    const handle = vi.spyOn(service, 'handleMessageRouted').mockResolvedValue(undefined);

    await service['onMessageRouted'](routed);

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ ...routed, zeroRetention: true }),
    );
    expect(zeroRetention.purgeChatTurn).toHaveBeenCalledWith('thread-1', 'msg-1');
    const answeredAt = handle.mock.invocationCallOrder[0] ?? Infinity;
    expect(zeroRetention.purgeChatTurn.mock.invocationCallOrder[0]).toBeGreaterThan(answeredAt);
  });

  it('still purges a marked turn whose answer failed', async () => {
    zeroRetention.isChatTurnMarked.mockResolvedValue(true);
    vi.spyOn(service, 'handleMessageRouted').mockRejectedValue(new Error('provider down'));

    await service['onMessageRouted'](routed);

    expect(zeroRetention.purgeChatTurn).toHaveBeenCalledWith('thread-1', 'msg-1');
  });

  it('leaves an unmarked turn exactly as before', async () => {
    const handle = vi.spyOn(service, 'handleMessageRouted').mockResolvedValue(undefined);

    await service['onMessageRouted'](routed);

    expect(handle).toHaveBeenCalledWith(expect.objectContaining(routed));
    expect(handle.mock.calls[0]?.[0]).not.toHaveProperty('zeroRetention');
    expect(zeroRetention.purgeChatTurn).not.toHaveBeenCalled();
  });

  it('publishes the completion with usage but without content under zero retention', () => {
    const assistant = chatMessage('answer-1', MessageRole.ASSISTANT, 'secret answer');
    const llm = {
      content: 'secret answer',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      inputTokens: 120,
      outputTokens: 40,
      latencyMs: 900,
      usedFallback: false,
    };

    service['publishMessageCompleted']({ ...routed, zeroRetention: true }, assistant, llm, null, [
      userMessage,
    ]);
    service['publishMessageCompleted'](routed, assistant, llm, null, [userMessage]);

    const completions = publish.mock.calls
      .filter(([pattern]) => pattern === EventPattern.MESSAGE_COMPLETED)
      .map(([, body]) => body);
    expect(completions[0]).toMatchObject({
      inputTokens: 120,
      outputTokens: 40,
      zeroRetention: true,
    });
    expect(completions[0]).not.toHaveProperty('content');
    expect(completions[0]).not.toHaveProperty('userContent');
    expect(completions[1]).toMatchObject({
      content: 'secret answer',
      userContent: 'secret prompt',
    });
    expect(completions[1]).not.toHaveProperty('zeroRetention');
  });
});

describe('RuntimeV2RunService with zero data retention', () => {
  const zeroRetention = { markRuntimeRun: vi.fn(async () => {}) };
  const createMessage = vi.fn(async () => {});
  let service: RuntimeV2RunService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleReference = await Test.createTestingModule({
      providers: [
        RuntimeV2RunService,
        { provide: ZeroRetentionService, useValue: zeroRetention },
        { provide: ChatThreadsRepository, useValue: { findById: vi.fn(async () => thread) } },
        {
          provide: ChatMessagesRepository,
          useValue: { create: createMessage, updateMetadata: vi.fn(async () => {}) },
        },
        { provide: RuntimeV2AccessService, useValue: { reserveStart: vi.fn(async () => {}) } },
        {
          provide: RuntimeV2Store,
          useValue: {
            start: vi.fn(async () => ({
              runId: 'run-1',
              generation: 'gen-1',
              messageId: 'msg-1',
              replayed: false,
            })),
          },
        },
        { provide: RabbitMQService, useValue: { publishConfirmed: vi.fn(async () => {}) } },
      ],
    }).compile();
    service = moduleReference.get(RuntimeV2RunService);
  });

  const request = {
    schemaVersion: '2.0' as const,
    threadId: 'thread-1',
    clientRequestId: 'runtime_request_00001',
    idempotencyKey: 'runtime_idempotency_1',
    prompt: 'secret prompt',
    manifestHash: `sha256:${'a'.repeat(64)}`,
    toolCatalogHash: `sha256:${'b'.repeat(64)}`,
    toolDefinitions: [],
    provider: 'OLLAMA',
    model: 'qwen3:1.7b',
    epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
    budget: {
      maxModelTurns: 4,
      maxToolCalls: 4,
      maxToolRounds: 2,
      maxRepairAttempts: 1,
      maxRuntimeMs: 60_000,
      maxOutputBytes: 65_536,
      maxToolResultBytes: 32_768,
    },
  };

  it('marks the run before its prompt is stored', async () => {
    await service.start('user-1', request, true);

    expect(zeroRetention.markRuntimeRun).toHaveBeenCalledWith('run-1');
    expect(createMessage.mock.invocationCallOrder[0]).toBeGreaterThan(
      zeroRetention.markRuntimeRun.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it('does not mark a run started without the header', async () => {
    await service.start('user-1', request);

    expect(zeroRetention.markRuntimeRun).not.toHaveBeenCalled();
    expect(createMessage).toHaveBeenCalled();
  });
});
