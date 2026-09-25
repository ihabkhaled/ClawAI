import { vi } from 'vitest';
// A voice note sent with "." as its text reached gemini-2.5-pro with the
// transcript in the system message and "." as the final user turn, and the
// model answered "Is there something I can help you with?" (2026-09-25). The
// fix lives in the builders every surface goes through — chat, the three
// compare lanes and all seven labs reach a model via callProvider, which uses
// exactly these — so it is asserted here, not per mode.
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ATTACHMENT_ONLY_TURN_MARKER } from '../../constants/attachment-only-turn.constants';
import { type ChatMessage } from '../../../../generated/prisma';
import { type AssembledContext, type FileContentResponse } from '../../types/context.types';

const voiceNote: FileContentResponse = {
  id: 'f-voice',
  filename: 'voice-note.webm',
  mimeType: 'audio/webm',
  content: null,
  extractedText: 'Hola, ¿qué tiempo hace mañana en Madrid?',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const image: FileContentResponse = {
  id: 'f-image',
  filename: 'photo.png',
  mimeType: 'image/png',
  content: 'iVBORw0KGgo=',
  extractedText: null,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const row = (id: string, role: string, content: string): ChatMessage =>
  ({ id, threadId: 't1', role, content, metadata: null }) as ChatMessage;

const contextWith = (
  messages: ChatMessage[],
  fileContents: FileContentResponse[],
): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: null,
    threadMessages: messages,
    memories: [],
    contextPackItems: [],
    fileContents,
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

const lastContent = (messages: ReturnType<ContextAssemblyManager['buildChatMessages']>): string => {
  const last = messages.at(-1);
  if (last === undefined) return '';
  if (typeof last.content === 'string') return last.content;
  const textPart = last.content.find((part) => part.type === 'text');
  return textPart !== undefined && 'text' in textPart ? textPart.text : '';
};

describe('ContextAssemblyManager attachment-only turns', () => {
  let manager: ContextAssemblyManager;

  beforeEach(() => {
    manager = new ContextAssemblyManager(
      { select: vi.fn() } as never,
      { retrieve: vi.fn() } as never,
      { needsWeb: vi.fn() } as never,
      { hasResearchAccess: vi.fn() } as never,
    );
  });

  it('turns a "." voice-note turn into a request to answer what was said', () => {
    const messages = manager.buildChatMessages(contextWith([row('m1', 'USER', '.')], [voiceNote]));

    const text = lastContent(messages);
    expect(text).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(text).toContain('what the speaker said');
    expect(text).toContain('language');
  });

  it('does the same on the Gemini-native path', () => {
    const messages = manager.buildGeminiChatMessages(
      contextWith([row('m1', 'USER', '')], [voiceNote]),
    );

    expect(lastContent(messages)).toContain(ATTACHMENT_ONLY_TURN_MARKER);
  });

  it('does the same on the single-string prompt path', () => {
    const prompt = manager.buildPromptString(contextWith([row('m1', 'USER', '')], [voiceNote]));

    expect(prompt).toContain(`USER: ${ATTACHMENT_ONLY_TURN_MARKER}`);
  });

  it('keeps an image as a multimodal part beside the instruction', () => {
    const messages = manager.buildChatMessages(contextWith([row('m1', 'USER', '')], [image]));

    const last = messages.at(-1);
    expect(Array.isArray(last?.content)).toBe(true);
    expect(lastContent(messages)).toContain('For an image');
  });

  it('leaves a real question untouched', () => {
    const messages = manager.buildChatMessages(
      contextWith([row('m1', 'USER', 'translate this to English')], [voiceNote]),
    );

    expect(lastContent(messages)).toBe('translate this to English');
  });

  it('leaves a trivial turn untouched when nothing is attached', () => {
    const messages = manager.buildChatMessages(contextWith([row('m1', 'USER', '.')], []));

    expect(lastContent(messages)).toBe('.');
  });

  it('never rewrites an earlier trivial turn in history', () => {
    const messages = manager.buildChatMessages(
      contextWith(
        [row('m1', 'USER', '.'), row('m2', 'ASSISTANT', 'ok'), row('m3', 'USER', 'and now?')],
        [voiceNote],
      ),
    );

    expect(messages.map((message) => message.content)).toContain('.');
    expect(lastContent(messages)).toBe('and now?');
  });
});
