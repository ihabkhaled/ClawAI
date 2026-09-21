import { type ChatMessage, type ChatThread } from '../../../../generated/prisma';
import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { type ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import { type ModelContextWindowClient } from '../../clients/model-context-window.client';
import { type ContextAssemblyManager } from '../context-assembly.manager';
import { ChatContextGatewayManager } from '../chat-context-gateway.manager';

/**
 * The gateway exists because every surface needed the same answer and each one
 * re-derived it, or quietly did not. These tests are about the four ways that
 * went wrong, so a future caller cannot reintroduce one by passing `undefined`.
 */

type AssembleCall = {
  userId: string;
  messages: ChatMessage[];
  threadSettings: unknown;
  contextPackIds: string[] | undefined;
  fileIds: string[] | undefined;
};

function message(id: string, role: 'USER' | 'ASSISTANT', metadata?: unknown): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role,
    content: `content of ${id}`,
    metadata: metadata ?? null,
  } as unknown as ChatMessage;
}

function harness(options: {
  messages?: ChatMessage[];
  thread?: Partial<ChatThread> | null;
  contextWindowTokens?: number;
}) {
  const calls: AssembleCall[] = [];
  const rows = options.messages ?? [];

  const thread =
    options.thread === null
      ? null
      : ({
          id: 'thread-1',
          userId: 'user-1',
          systemPrompt: 'You are terse.',
          temperature: 0.2,
          maxTokens: 1024,
          judgeModel: null,
          useCrossThreadContext: true,
          criticEnabled: false,
          criticModel: null,
          qualityThreshold: null,
          maxReRouteAttempts: null,
          contextPackIds: ['pack-1'],
          ...options.thread,
        } as unknown as ChatThread);

  const manager = new ChatContextGatewayManager(
    {
      // Repositories return newest-first; the gateway is responsible for
      // flipping that, which is a step three managers each did by hand.
      findRecentByThreadId: async () => [...rows].reverse(),
    } as unknown as ChatMessagesRepository,
    { findById: async () => thread } as unknown as ChatThreadsRepository,
    {
      assemble: async (
        userId: string,
        messages: ChatMessage[],
        threadSettings: unknown,
        contextPackIds: string[] | undefined,
        fileIds: string[] | undefined,
      ) => {
        calls.push({ userId, messages, threadSettings, contextPackIds, fileIds });
        return {
          systemPrompt: (threadSettings as { systemPrompt?: string } | undefined)?.systemPrompt
            ? 'You are terse.'
            : null,
          memories: [],
          crossThread: null,
        };
      },
    } as unknown as ContextAssemblyManager,
    {
      findContextWindowTokens: async () => options.contextWindowTokens ?? 200_000,
    } as unknown as ModelContextWindowClient,
  );

  return { manager, calls };
}

describe('ChatContextGatewayManager', () => {
  it('hands the assembler the conversation oldest first', async () => {
    const { manager, calls } = harness({
      messages: [message('m1', 'USER'), message('m2', 'ASSISTANT'), message('m3', 'USER')],
    });

    await manager.build({ userId: 'user-1', threadId: 'thread-1', surface: ChatSurface.COMPARE });

    expect(calls[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('passes the thread settings a chat turn passes, in full', async () => {
    // The coding agent passed three of these nine and lost cross-thread context
    // silently, because `useCrossThreadContext` arriving undefined reads as
    // false against the assembler's `=== true` test.
    const { manager, calls } = harness({ messages: [message('m1', 'USER')] });

    await manager.build({ userId: 'user-1', threadId: 'thread-1', surface: ChatSurface.AGENT });

    expect(calls[0]?.threadSettings).toMatchObject({
      systemPrompt: 'You are terse.',
      temperature: 0.2,
      maxTokens: 1024,
      useCrossThreadContext: true,
      criticEnabled: false,
    });
  });

  it('resolves the real context window when a model is named', async () => {
    // Skipping this budgets a 200k model as if it were the conservative
    // default and throws away history there was room for.
    const { manager, calls } = harness({
      messages: [message('m1', 'USER')],
      contextWindowTokens: 200_000,
    });

    await manager.build({
      userId: 'user-1',
      threadId: 'thread-1',
      surface: ChatSurface.CHAT,
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
    });

    expect(calls[0]?.threadSettings).toMatchObject({
      provider: 'ANTHROPIC',
      contextWindowTokens: 200_000,
    });
  });

  it('finds attachments on the latest user message', async () => {
    const { manager, calls } = harness({
      messages: [
        message('m1', 'USER', { fileIds: ['old-file'] }),
        message('m2', 'ASSISTANT'),
        message('m3', 'USER', { fileIds: ['file-a', 'file-b'] }),
      ],
    });

    await manager.build({ userId: 'user-1', threadId: 'thread-1', surface: ChatSurface.CONSENSUS });

    expect(calls[0]?.fileIds).toEqual(['file-a', 'file-b']);
  });

  it("prefers the caller's attachments, because a lab mode gets them on its DTO", async () => {
    const { manager, calls } = harness({
      messages: [message('m1', 'USER', { fileIds: ['from-thread'] })],
    });

    await manager.build({
      userId: 'user-1',
      threadId: 'thread-1',
      surface: ChatSurface.BEST_OF_N,
      fileIds: ['from-dto'],
    });

    expect(calls[0]?.fileIds).toEqual(['from-dto']);
  });

  it('cuts the history at the routed message, so a re-run sees what that turn saw', async () => {
    const { manager, calls } = harness({
      messages: [
        message('m1', 'USER'),
        message('m2', 'ASSISTANT'),
        message('m3', 'USER'),
        message('m4', 'ASSISTANT'),
      ],
    });

    await manager.build({
      userId: 'user-1',
      threadId: 'thread-1',
      surface: ChatSurface.REPAIR,
      routedMessageId: 'm3',
    });

    expect(calls[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('adds a persona to the user system prompt instead of replacing it', async () => {
    // Replacing it is how the judge stopped knowing what the user had asked
    // the model to be.
    const { manager } = harness({ messages: [message('m1', 'USER')] });

    const bundle = await manager.build({
      userId: 'user-1',
      threadId: 'thread-1',
      surface: ChatSurface.ROLE_PACK,
      personaInstruction: 'You are a security reviewer.',
    });

    expect(bundle.context.systemPrompt).toBe('You are terse.\n\nYou are a security reviewer.');
  });

  it('serves a surface with no thread yet rather than refusing', async () => {
    const { manager, calls } = harness({ thread: null });

    const bundle = await manager.build({
      userId: 'user-1',
      threadId: null,
      surface: ChatSurface.DECOMPOSE,
    });

    expect(calls[0]?.messages).toEqual([]);
    expect(bundle.thread).toBeNull();
  });

  it('passes the thread context packs through', async () => {
    const { manager, calls } = harness({ messages: [message('m1', 'USER')] });

    await manager.build({ userId: 'user-1', threadId: 'thread-1', surface: ChatSurface.PIPELINE });

    expect(calls[0]?.contextPackIds).toEqual(['pack-1']);
  });
});
