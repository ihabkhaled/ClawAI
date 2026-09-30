import { vi } from 'vitest';
// A save turn's note rides on the final user turn in every prompt builder
// (chat, Gemini-native, single-string), because the system prompt alone lost
// to a small model's prior (ADR-134 addendum). The stored row never changes.
import { ContextAssemblyManager } from '../context-assembly.manager';
import { CONTEXT_SAVE_TURN_MARKER } from '../../constants/save-intent.constants';
import { withContextSaveNote } from '../../utilities/context-save-note.utility';
import { type ChatMessage } from '../../../../generated/prisma';
import { type AssembledContext } from '../../types/context.types';

const row = (id: string, role: string, content: string): ChatMessage =>
  ({ id, threadId: 't1', role, content, metadata: null }) as ChatMessage;

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

describe('ContextAssemblyManager save-turn note', () => {
  let manager: ContextAssemblyManager;
  const note = 'PLATFORM ACTION: NOTHING has been saved to a context pack yet.';

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
    row('a1', 'ASSISTANT', 'Day 1: Eiffel'),
    row('u2', 'USER', 'Add this to my context'),
  ];

  it('repeats the note after the final user turn, on every builder', () => {
    const context = withContextSaveNote(contextWith(thread), note);
    const last = textOf(manager.buildChatMessages(context).at(-1)?.content);

    expect(last).toBe(`Add this to my context

${CONTEXT_SAVE_TURN_MARKER}
${note}`);
    expect(textOf(manager.buildGeminiChatMessages(context).at(-1)?.content)).toContain(note);
    expect(manager.buildPromptString(context)).toContain(`${CONTEXT_SAVE_TURN_MARKER}
${note}`);
  });

  it('keeps it in the system prompt too, and never on an earlier turn', () => {
    const messages = manager.buildChatMessages(withContextSaveNote(contextWith(thread), note));

    expect(textOf(messages[0]?.content)).toContain(note);
    expect(textOf(messages.find((m) => m.role === 'user')?.content)).toBe('Plan Paris');
  });

  it('leaves the stored messages and an ordinary turn untouched', () => {
    const context = withContextSaveNote(contextWith(thread), note);

    expect(context.threadMessages.at(-1)?.content).toBe('Add this to my context');
    expect(textOf(manager.buildChatMessages(contextWith(thread)).at(-1)?.content)).toBe(
      'Add this to my context',
    );
  });
});
