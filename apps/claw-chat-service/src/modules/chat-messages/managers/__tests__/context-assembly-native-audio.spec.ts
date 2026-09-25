// Rule 42 item 22: a voice note rides natively (Gemini inline_data audio part)
// only to a lane whose catalog row says audio input SUPPORTED, within the size
// cap and the window share — and it keeps its transcript beside it. Every
// OpenAI-shaped / Anthropic / Ollama payload is built without audio parts.

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import type { ChatMessage } from '../../../../generated/prisma';
import {
  NATIVE_AUDIO_TRANSCRIPT_FAILED_NOTE,
  NATIVE_AUDIO_TRANSCRIPT_PENDING_NOTE,
  NATIVE_AUDIO_WITH_TRANSCRIPT_NOTE,
} from '../../constants/native-audio.constants';
import { VOICE_NOTE_TRANSCRIPT_FRAME } from '../../constants/voice-note.constants';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { buildGeminiRequestBody } from '../../utilities/gemini-request-builder.utility';
import { AttachmentDeliveryManager } from '../attachment-delivery.manager';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;

const AUDIO_BYTES = Buffer.from('opus-bytes-of-a-voice-note').toString('base64');
const TRANSCRIPT = 'Please book the table for eight people on Friday.';

const assembly = new ContextAssemblyManager(
  new ContextComposerManager(),
  new CrossThreadRetrievalManager({
    findCandidateThreads: async () => Promise.resolve([]),
    findMessagesForThreads: async () => Promise.resolve([]),
  } as never),
  { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
  { hasResearchAccess: async () => true } as never,
);

const AUDIO_INPUT_BY_MODEL: ReadonlyMap<string, MediaCapabilityState> = new Map([
  ['GEMINI/gemini-2.5-flash', SUPPORTED],
  ['GEMINI/gemini-2.5-flash-preview-tts', UNSUPPORTED],
  ['OPENAI/gpt-4o-audio-preview', SUPPORTED],
  ['ANTHROPIC/claude-sonnet-4-5', UNSUPPORTED],
]);

const delivery = new AttachmentDeliveryManager({
  resolve: async (provider: string, model: string): Promise<ModelMediaCapabilities> =>
    Promise.resolve({
      vision: SUPPORTED,
      videoInput: UNKNOWN,
      audioInput: AUDIO_INPUT_BY_MODEL.get(`${provider}/${model}`) ?? UNKNOWN,
    }),
  listVideoCapableModels: async () => Promise.resolve(null),
} as never);

const voiceNote = (overrides: Partial<FileContentResponse> = {}): FileContentResponse => ({
  id: 'memo-1',
  filename: 'memo.webm',
  mimeType: 'audio/webm',
  content: AUDIO_BYTES,
  extractedText: TRANSCRIPT,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
  ...overrides,
});

function contextWith(files: FileContentResponse[]): AssembledContext {
  const message: ChatMessage = {
    id: 'msg-1',
    threadId: 'thread-1',
    role: 'USER',
    content: 'What did I ask for?',
    metadata: null,
    createdAt: new Date('2026-09-26T00:00:00.000Z'),
  } as ChatMessage;
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [message],
    memories: [],
    contextPackItems: [],
    fileContents: files,
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 8_000,
    modelBudget: { ...fallbackModelTokenBudget(), contextWindowTokens: 1_000_000 },
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  };
}

const uploadNever = async (): Promise<string> =>
  Promise.reject(new Error('a voice note this small is never uploaded'));

describe('native audio on a lane that can hear it', () => {
  it('sends Gemini an inline_data audio part AND keeps the transcript framed as speech', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote()]),
      'GEMINI',
      'gemini-2.5-flash',
    );
    expect(lane.attachmentDelivery?.decisions[0]).toMatchObject({
      mode: FileDeliveryMode.NATIVE_AUDIO,
      sendNative: true,
    });

    const shape = await buildGeminiRequestBody(
      assembly.buildGeminiChatMessages(lane),
      uploadNever,
      20 * 1024 * 1024,
    );
    const userParts = shape.body.contents.at(-1)?.parts ?? [];
    expect(userParts).toContainEqual({
      inline_data: { mime_type: 'audio/webm', data: AUDIO_BYTES },
    });
    const system = JSON.stringify(shape.body.systemInstruction);
    expect(system).toContain(VOICE_NOTE_TRANSCRIPT_FRAME);
    expect(system).toContain(NATIVE_AUDIO_WITH_TRANSCRIPT_NOTE);
    expect(system).toContain(TRANSCRIPT);
  });

  it('drops codec parameters from the part media type (a data URL cannot carry them)', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote({ mimeType: 'audio/webm;codecs=opus' })]),
      'GEMINI',
      'gemini-2.5-flash',
    );

    expect(JSON.stringify(assembly.buildGeminiChatMessages(lane))).toContain(
      `data:audio/webm;base64,${AUDIO_BYTES}`,
    );
  });

  it('still sends the recording while the transcript is processing, with an honest note', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote({ extractedText: '[Audio file: memo.webm]' })]),
      'GEMINI',
      'gemini-2.5-flash',
    );
    const payload = JSON.stringify(assembly.buildGeminiChatMessages(lane));

    expect(lane.attachmentDelivery?.decisions[0]).toMatchObject({
      mode: FileDeliveryMode.NATIVE_AUDIO,
      reason: 'file_delivery.reason.native_audio_transcript_pending',
    });
    expect(payload).toContain(AUDIO_BYTES);
    expect(payload).toContain(NATIVE_AUDIO_TRANSCRIPT_PENDING_NOTE);
    expect(payload).not.toContain('[Audio file:');
  });

  it('still sends the recording when transcription failed, with an honest note', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote({ extractedText: '[Audio file: memo.webm]', extractionError: 'x' })]),
      'GEMINI',
      'gemini-2.5-flash',
    );

    expect(JSON.stringify(assembly.buildGeminiChatMessages(lane))).toContain(
      NATIVE_AUDIO_TRANSCRIPT_FAILED_NOTE,
    );
  });
});

describe('a transport that cannot carry audio (tool-carrying Gemini turn)', () => {
  it('resolves TRANSCRIPT, and a plan is never reused across transports', async () => {
    const native = await delivery.applyToContext(
      contextWith([voiceNote()]),
      'GEMINI',
      'gemini-2.5-flash',
    );
    const compatible = await delivery.applyToContext(native, 'GEMINI', 'gemini-2.5-flash', {
      nativeMediaTransport: false,
    });

    expect(native.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.NATIVE_AUDIO);
    expect(compatible.attachmentDelivery?.decisions[0]).toMatchObject({
      mode: FileDeliveryMode.TRANSCRIPT,
      sendNative: false,
    });
    expect(JSON.stringify(assembly.buildGeminiChatMessages(compatible))).not.toContain(AUDIO_BYTES);
  });
});

describe('every other lane reads the transcript', () => {
  it('a Gemini model the catalog says cannot hear gets TRANSCRIPT and no audio bytes', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote()]),
      'GEMINI',
      'gemini-2.5-flash-preview-tts',
    );

    expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.TRANSCRIPT);
    const payload = JSON.stringify(assembly.buildGeminiChatMessages(lane));
    expect(payload).not.toContain(AUDIO_BYTES);
    expect(payload).toContain(TRANSCRIPT);
  });

  it('an oversized recording falls back to TRANSCRIPT', async () => {
    const huge = 'A'.repeat(Math.ceil((16 * 1024 * 1024) / 0.75));
    const lane = await delivery.applyToContext(
      contextWith([voiceNote({ content: huge })]),
      'GEMINI',
      'gemini-2.5-flash',
    );

    expect(lane.attachmentDelivery?.decisions[0]).toMatchObject({
      mode: FileDeliveryMode.TRANSCRIPT,
      sendNative: false,
    });
  });

  it.each([
    ['OPENAI', 'gpt-4o-audio-preview'],
    ['ANTHROPIC', 'claude-sonnet-4-5'],
  ])(
    '%s/%s never receives an audio part, even when its catalog row says audio',
    async (provider, model) => {
      const lane = await delivery.applyToContext(contextWith([voiceNote()]), provider, model);
      const payload = JSON.stringify(assembly.buildChatMessages(lane));

      expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.TRANSCRIPT);
      expect(payload).not.toContain('data:audio');
      expect(payload).not.toContain(AUDIO_BYTES);
      expect(payload).toContain(TRANSCRIPT);
    },
  );

  it('the OpenAI-shaped builder carries no audio even for a Gemini NATIVE_AUDIO plan', async () => {
    const lane = await delivery.applyToContext(
      contextWith([voiceNote()]),
      'GEMINI',
      'gemini-2.5-flash',
    );

    expect(JSON.stringify(assembly.buildChatMessages(lane))).not.toContain(AUDIO_BYTES);
  });
});
