import { vi } from 'vitest';
// A quote is structured metadata on the user row; the stored text stays what
// the user typed. These assert every prompt builder (chat, Gemini-native,
// single-string) shows the model the quoted words — on the latest turn AND on
// an earlier one, so a follow-up still knows what was being discussed.
import { ContextAssemblyManager } from '../context-assembly.manager';
import { QUOTED_CONTEXT_HEADING } from '../../constants/message-quotes.constants';
import { type ChatMessage } from '../../../../generated/prisma';
import { type AssembledContext } from '../../types/context.types';

const quoted = {
  quotes: [{ sourceMessageId: 'a1', sourceRole: 'ASSISTANT', text: 'Day 2: Louvre' }],
};

const row = (id: string, role: string, content: string, metadata: unknown = null): ChatMessage =>
  ({ id, threadId: 't1', role, content, metadata }) as ChatMessage;

const contextWith = (messages: ChatMessage[]): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: null,
    threadMessages: messages,
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 100_000,
    modelBudget: {} as never,
    conversationManifest: {} as never,
    crossThread: { selections: [] } as never,
  }) as AssembledContext;

const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : JSON.stringify(content);

describe('ContextAssemblyManager quoted turns', () => {
  let manager: ContextAssemblyManager;

  beforeEach(() => {
    manager = new ContextAssemblyManager(
      { select: vi.fn() } as never,
      { retrieve: vi.fn() } as never,
      { needsWeb: vi.fn() } as never,
      { hasResearchAccess: vi.fn() } as never,
    );
  });

  const thread = [
    row('u1', 'USER', 'Plan Paris'),
    row('a1', 'ASSISTANT', 'Day 1: Eiffel. Day 2: Louvre'),
    row('u2', 'USER', 'Swap this for a museum pass?', quoted),
  ];

  it('shows the quote above the latest turn', () => {
    const last = manager.buildChatMessages(contextWith(thread)).at(-1);

    expect(textOf(last?.content)).toContain(`${QUOTED_CONTEXT_HEADING}\n> Day 2: Louvre`);
    expect(textOf(last?.content)).toContain('Swap this for a museum pass?');
  });

  it('keeps the quote on an earlier turn, so a follow-up still has it', () => {
    const messages = manager.buildChatMessages(
      contextWith([...thread, row('a2', 'ASSISTANT', 'Yes.'), row('u3', 'USER', 'And the price?')]),
    );

    expect(messages.some((message) => textOf(message.content).includes('> Day 2: Louvre'))).toBe(
      true,
    );
  });

  it('does the same on the Gemini-native and single-string paths', () => {
    const gemini = manager.buildGeminiChatMessages(contextWith(thread)).at(-1);

    expect(textOf(gemini?.content)).toContain('> Day 2: Louvre');
    expect(manager.buildPromptString(contextWith(thread))).toContain('> Day 2: Louvre');
  });

  it('leaves an unquoted turn exactly as typed', () => {
    const last = manager.buildChatMessages(contextWith([row('u1', 'USER', 'hello')])).at(-1);

    expect(textOf(last?.content)).toBe('hello');
  });
});
