import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { ChatMessage } from '../../../generated/prisma';
import type { AssembledContext } from '../types/context.types';

describe('ContextAssemblyManager', () => {
  const manager = new ContextAssemblyManager();

  const buildContext = (): AssembledContext => ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'Find the latest Windows 11 24H2 issues.',
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
        createdAt: new Date('2026-04-21T06:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: 'run-1',
    researchWarnings: [
      'Search results were withheld because the returned pages were too weakly matched to the request.',
    ],
    tokenBudget: 512,
  });

  it('includes research warnings even when no evidence items survive filtering', () => {
    const prompt = manager.buildPromptString(buildContext());

    expect(prompt).toContain('No reliable search evidence passed relevance validation');
    expect(prompt).toContain('Do not invent facts');
    expect(prompt).toContain('WARNINGS:');
    expect(prompt).toContain('too weakly matched');
  });

  it('drops unrelated prior assistant content and unrelated memories for self-contained prompts', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content: 'Design a geometric logo for a privacy startup.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content: 'Semi-Circle Shape Concept with heart symbol and mascot directions.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content:
          'Refactor a callback-heavy handler into async await with structured error handling.',
      } as ChatMessage,
    ];
    context.memories = [
      {
        id: 'mem-1',
        userId: 'user-1',
        type: 'NOTE',
        content: 'The user likes logo concepts with circles and mascots.',
        isEnabled: true,
      },
      {
        id: 'mem-2',
        userId: 'user-1',
        type: 'PREFERENCE',
        content: 'The user prefers concise technical answers.',
        isEnabled: true,
      },
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).not.toContain('Semi-Circle Shape Concept');
    expect(prompt).not.toContain('likes logo concepts');
    expect(prompt).toContain('prefers concise technical answers');
    expect(prompt).toContain('Refactor a callback-heavy handler');
  });

  it('keeps recent context for clear follow-up prompts', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content: 'Design a geometric logo for a privacy startup.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content: 'Semi-Circle Shape Concept with heart symbol and mascot directions.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content: 'Make that shorter and keep the same style.',
      } as ChatMessage,
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).toContain('Semi-Circle Shape Concept');
    expect(prompt).toContain('Make that shorter and keep the same style.');
  });

  it('does not keep unrelated prior context only because role prefixes overlap', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content:
          'As Associate backend engineer, describe a TypeScript service that retries SSE requests with backoff, logging, and tests.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content:
          'Build an SseClientService with retry policies, logging hooks, and reconnection tests.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content:
          'As Senior backend engineer, review this API design for race conditions and suggest a cleaner async flow.',
      } as ChatMessage,
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).not.toContain('SseClientService');
    expect(prompt).toContain('review this API design for race conditions');
  });
});
